'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useMarkdownRender } from '@/hooks/use-markdown-render'
import { pushAbout, type AboutData } from './services/push-about'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import LikeButton from '@/components/like-button'
import GithubSVG from '@/svgs/github.svg'
import initialData from './list.json'

// 兼容旧版 content 和新版 intro/timeline 的类型推导
type ExtendedAboutData = AboutData & {
	intro?: string
	content?: string
	timeline?: Array<{
		date: string
		title: string
		content: string
	}>
}

export default function Page() {
	const [data, setData] = useState<ExtendedAboutData>(initialData as ExtendedAboutData)
	const [originalData, setOriginalData] = useState<ExtendedAboutData>(initialData as ExtendedAboutData)
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isPreviewMode, setIsPreviewMode] = useState(false)
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	
	// 兼容处理：如果没有 intro 则退回使用旧的 content
	const { content: introContent, loading } = useMarkdownRender(data.intro || data.content || '')
	const hideEditButton = siteContent.hideEditButton ?? false

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	const handleEnterEditMode = () => {
		setIsEditMode(true)
		setIsPreviewMode(false)
	}

	const handleSave = async () => {
		setIsSaving(true)

		try {
			// 如果你的 pushAbout 做了类型检查，可能需要把 intro 和 timeline 一起发过去
			await pushAbout(data as AboutData)

			setOriginalData(data)
			setIsEditMode(false)
			setIsPreviewMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		setData(originalData)
		setIsEditMode(false)
		setIsPreviewMode(false)
	}

	// --- 时间线编辑辅助函数 ---
	const updateTimeline = (index: number, field: 'date' | 'title' | 'content', value: string) => {
		const newTimeline = [...(data.timeline || [])]
		newTimeline[index] = { ...newTimeline[index], [field]: value }
		setData({ ...data, timeline: newTimeline })
	}

	const addTimelineItem = () => {
		const newTimeline = [...(data.timeline || []), { date: '', title: '', content: '' }]
		setData({ ...data, timeline: newTimeline })
	}

	const removeTimelineItem = (index: number) => {
		const newTimeline = (data.timeline || []).filter((_, i) => i !== index)
		setData({ ...data, timeline: newTimeline })
	}

	// --- 渲染时间线组件 ---
	const renderTimelineUI = () => {
		if (!data.timeline || data.timeline.length === 0) return null
		return (
			<div className='relative ml-[7px] mt-12 border-l-2 border-border/60'>
				{data.timeline.map((item, index) => (
					<div key={index} className='relative mb-10 pl-8'>
						{/* 时间线圆点 */}
						<div className='absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-[3px] border-brand bg-card' />
						<div className='text-sm font-bold text-brand'>{item.date}</div>
						<h3 className='mt-1 text-lg font-bold text-primary'>{item.title}</h3>
						<p className='mt-2 text-sm leading-relaxed text-secondary'>{item.content}</p>
					</div>
				))}
			</div>
		)
	}

	const buttonText = isAuth ? '保存' : '导入密钥'

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
				setIsPreviewMode(false)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className='flex flex-col items-center justify-center px-6 pt-32 pb-12 max-sm:px-0'>
				<div className='w-full max-w-[800px]'>
					{isEditMode ? (
						isPreviewMode ? (
							<div className='space-y-6'>
								<div className='text-center'>
									<h1 className='mb-4 text-4xl font-bold'>{data.title || '标题预览'}</h1>
									<p className='text-lg text-secondary'>{data.description || '描述预览'}</p>
								</div>

								{loading ? (
									<div className='text-center text-secondary'>预览渲染中...</div>
								) : (
									<div className='card relative p-6 md:p-10'>
										<div className='prose prose-sm max-w-none'>{introContent}</div>
										{renderTimelineUI()}
									</div>
								)}
							</div>
						) : (
							<div className='space-y-6'>
								<div className='space-y-4'>
									<input
										type='text'
										placeholder='标题'
										className='w-full px-4 py-3 text-center text-2xl font-bold bg-transparent outline-none'
										value={data.title}
										onChange={e => setData({ ...data, title: e.target.value })}
									/>
									<input
										type='text'
										placeholder='描述'
										className='w-full px-4 py-3 text-center text-lg bg-transparent outline-none'
										value={data.description}
										onChange={e => setData({ ...data, description: e.target.value })}
									/>
								</div>

								<div className='card relative p-6'>
									<div className='text-sm font-bold text-secondary mb-2'>简介 (Markdown)</div>
									<textarea
										placeholder='Markdown 内容'
										className='min-h-[200px] w-full resize-none text-sm bg-transparent outline-none mb-6'
										value={data.intro !== undefined ? data.intro : data.content}
										onChange={e => setData({ ...data, intro: e.target.value, content: undefined })}
									/>

									{/* 时间线编辑器 */}
									<div className='space-y-4 border-t border-border pt-6'>
										<div className='text-sm font-bold text-secondary'>时间线设置</div>
										{data.timeline?.map((item, index) => (
											<div key={index} className='relative flex flex-col gap-3 rounded-xl border border-border bg-black/5 p-4 dark:bg-white/5'>
												<button
													type='button'
													onClick={() => removeTimelineItem(index)}
													className='absolute right-4 top-4 text-xs text-red-500 hover:text-red-600'>
													删除
												</button>
												<input
													type='text'
													placeholder='日期 (例如: 2023年10月)'
													className='w-[80%] bg-transparent text-sm font-bold text-brand outline-none'
													value={item.date}
													onChange={e => updateTimeline(index, 'date', e.target.value)}
												/>
												<input
													type='text'
													placeholder='节点标题'
													className='w-[80%] bg-transparent font-bold outline-none'
													value={item.title}
													onChange={e => updateTimeline(index, 'title', e.target.value)}
												/>
												<textarea
													placeholder='内容描述'
													className='min-h-[60px] w-full resize-none bg-transparent text-sm text-secondary outline-none'
													value={item.content}
													onChange={e => updateTimeline(index, 'content', e.target.value)}
												/>
											</div>
										))}
										<button
											type='button'
											onClick={addTimelineItem}
											className='w-full rounded-xl border border-dashed border-border py-3 text-sm text-secondary transition-colors hover:bg-black/5 dark:hover:bg-white/5'>
											+ 添加时间节点
										</button>
									</div>
								</div>
							</div>
						)
					) : (
						<>
							<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='mb-12 text-center'>
								<h1 className='mb-4 text-4xl font-bold'>{data.title}</h1>
								<p className='text-lg text-secondary'>{data.description}</p>
							</motion.div>

							{loading ? (
								<div className='text-center text-secondary'>加载中...</div>
							) : (
								<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className='card relative p-6 md:p-10'>
									<div className='prose prose-sm max-w-none'>{introContent}</div>
									{renderTimelineUI()}
								</motion.div>
							)}
						</>
					)}

					<div className='mt-8 flex items-center justify-center gap-6'>
						<motion.a
							href='https://github.com/qiaowenjie124/qiaowenjie'
							target='_blank'
							rel='noreferrer'
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0 }}
							className='flex h-[53px] w-[53px] items-center justify-center rounded-full border bg-card'>
							<GithubSVG />
						</motion.a>

						<LikeButton slug='open-source' delay={0} />
					</div>
				</div>
			</div>

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='fixed right-6 top-4 z-10 flex gap-3 max-sm:hidden'>
				{isEditMode ? (
					<>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm dark:bg-black/60'>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsPreviewMode(prev => !prev)}
							disabled={isSaving}
							className={`rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm dark:bg-black/60`}>
							{isPreviewMode ? '继续编辑' : '预览'}
						</motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleEnterEditMode}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80 dark:bg-black/60 dark:hover:bg-black/80'>
							编辑
						</motion.button>
					)
				)}
			</motion.div>
		</>
	)
}