import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'

// 更新了这里的类型定义，加入 intro 和 timeline，同时兼容旧的 content
export type AboutData = {
    title: string
    description: string
    intro?: string
    content?: string
    timeline?: Array<{
        date: string
        title: string
        content: string
    }>
}

export async function pushAbout(data: AboutData): Promise<void> {
    const token = await getAuthToken()

    toast.info('正在获取分支信息...')
    const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
    const latestCommitSha = refData.sha

    const commitMessage = `更新关于页面`

    toast.info('正在准备文件...')

    const treeItems: TreeItem[] = []

    // 这里的 JSON.stringify 会自动把你新增的 intro 和 timeline 数组序列化保存
    const aboutJson = JSON.stringify(data, null, '\t')
    const aboutBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(aboutJson), 'base64')
    treeItems.push({
        path: 'src/app/(home)/about/list.json', // ⚠️ 注意：根据你的目录结构，我把这里补全为 (home)/about/list.json 以防提交错位置
        mode: '100644',
        type: 'blob',
        sha: aboutBlob.sha
    })

    toast.info('正在创建文件树...')
    const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

    toast.info('正在创建提交...')
    const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

    toast.info('正在更新分支...')
    await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

    toast.success('发布成功！')
}