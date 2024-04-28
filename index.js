#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import process from 'process'
import child_process from 'child_process'
import readline from 'node:readline'
const exec = child_process.execSync

const rootPath = process.cwd()
const consoleLogPath = path.join(rootPath, 'publishLog') // 发布包目录说明
const modulePath = path.join(rootPath, '/node_modules') //要发布的包目录
const res = fs.readdirSync(modulePath)
let total = 0,
    successCount = 0,
    failCount = 0,
    failGroup = [],
    successGroup = [];
check(res, modulePath)
function check(res, modulePath) {

    res.forEach((item, index) => {
        const dPath = path.join(modulePath, item)
        const stat = fs.statSync(dPath)

        if (stat.isDirectory()) {
            total++
            const packageJsonPath = path.join(dPath, 'package.json')

            if (fs.existsSync(packageJsonPath)) {
                const packageJsonContentString = fs.readFileSync(packageJsonPath, 'utf-8')
                const parsePackageJson = JSON.parse(packageJsonContentString)
                if (
                    parsePackageJson.scripts &&
                    Object.keys(parsePackageJson.scripts).length !== 0
                ) {
                    parsePackageJson.scripts = {}
                    fs.writeFileSync(packageJsonPath, JSON.stringify(parsePackageJson))
                }
                const isPublish = true

                try {
                    if (isPublish) {
                        successGroup.push(
                            {
                                dPath,
                                index: index,
                                name: parsePackageJson.name,
                                version: parsePackageJson.version
                            }
                        )
                    } else {
                    }
                    successCount++
                } catch {
                    console.log("check报错")
                }
            } else {
                failCount++
                failGroup.push(`->${dPath}@文件夹package.json不存在`)
            }
        }
    })
    console.log(`共${total}个文件夹，${successGroup.length}个文件夹即将被放置到verdaccio!,${failGroup.length}个文件夹不存在package.json！\n`)
    if (successGroup.length !== 0) {
        console.log('搜索成功的包列表：\n')
        successGroup.forEach((r) => {
            console.log(`${r.path}\n`)
        })
    }
    if (failGroup.length !== 0) {
        console.log('失败的包列表：\n')
        failGroup.forEach((f) => {
            console.log(`${f}\n`)
        })
    }
}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('是否下一步?(y or n)', (answer) => {
    if (/[y]|[yes]/gi.test(answer)) {
        batchPublish(successGroup, consoleLogPath, modulePath)
    }
    // rl.close();
  }); 

function batchPublish(successGroup, consoleLogPath, modulePath) {
    let batchSuccessGroup = []
    let batchFailGroup = []
    let deleteGroup = []
    successGroup.forEach(({ dPath, index, name, version }) => {
        console.log(dPath)
        process.chdir(dPath)
        console.log(`目前位置在：${dPath} 第${index + 1}个文件夹\n`)
        const isPublish = true
        try {
            if (isPublish) {
                console.log(
                    `${name}@${version}正在发布中...\n`
                )
                exec('npm version patch && npm publish --registry http://localhost:4873/')
                console.log(
                    `本次下标第${index + 1}个文件夹`,
                    dPath,
                    name,
                    version,
                    '发布成功！\n'
                )
                batchSuccessGroup.push({
                    path: dPath
                })
            } else {
                console.log(
                    `${name}@${version}正在删除中...\n`
                )
                exec(
                    `npm unpublish ${name} --force --registry http://localhost:4873/`
                )
                console.log(
                    `本次下标第${index + 1}个文件夹`,
                    dPath,
                    name,
                    version,
                    '删除成功！\n'
                )
                deleteGroup.push({
                    path: dPath
                })
            }
            fs.appendFileSync(
                consoleLogPath,
                `${isPublish ? '发布包' : '删除包'}->${dPath}/${name}@${version
                }\n`
            )
        } catch {
            if (isPublish) {
                console.log(
                    `包${dPath}:${item}@${version}已发布过/发布失败！\n`
                )
            } else {
                console.log(
                    `包${dPath}:${item}@${version}不存在/删除失败！\n`
                )
            }
            batchFailGroup.push({
                path: dPath
            })
        }
        process.chdir(rootPath)
    })
    console.log(`共${successGroup.length}个文件夹，成功${batchSuccessGroup.length}个文件夹！，失败${batchFailGroup.length}个文件夹！\n`)
    if (deleteGroup.length !== 0) {
        console.log(`删除了${deleteGroup.length}个文件夹！`)
    }
    if (batchFailGroup.length !== 0) {
        console.log('失败的包列表：\n')
        batchFailGroup.forEach((f) => {
            console.log(`${f.path}\n`)
        })
    }
}