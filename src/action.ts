import { getInput, info, startGroup, endGroup } from '@actions/core'
import * as github from '@actions/github'
import fs from 'fs-extra'
import createGitCli from 'simple-git'

const enum Input {
  TOKEN = 'token',
  OUT_DIR = 'out-dir',
  OUT_FILE = 'out-file',
  CONTENT = 'content'
}

const git = createGitCli(process.cwd())

export async function main() {
  const token = getInput(Input.TOKEN, { required: true })
  const docsDir = getInput(Input.OUT_DIR)
  const outFile = getInput(Input.OUT_FILE, { required: true })
  const content = getInput(Input.CONTENT, { required: true })

  // https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#github-context
  // https://github.com/actions/checkout/blob/25a956c84d5dd820d28caab9f86b8d183aeeff3d/src/input-helper.ts#L22
  const username = github.context.actor || github.context.repo.owner
  const repoName = github.context.repo.repo
  const remoteOrigin = `https://${username}:${token}@github.com/${username}/${repoName}.git`
  const outFilePath =
    (docsDir.endsWith('/') ? docsDir : `${docsDir}/`) +
    (/\.mdx?$/.test(outFile) ? outFile : `${outFile}.md`)

  startGroup('Create local file')
  await fs.outputFile(outFilePath, content)
  info(`New data is available in the ${username}/${repoName}/${outFilePath}`)
  endGroup()

  if (username) {
    await git.addConfig('user.email', `${username}@users.noreply.github.com`)
  }

  await git
    .addConfig('user.name', username)
    .add('.')
    .commit(`docs: sync \`${outFile.slice(0, 24)}\` from yuque.com`, [
      '--signoff'
    ])
    .push(remoteOrigin)

  info(`New data has been uploaded to remote git.`)
}
