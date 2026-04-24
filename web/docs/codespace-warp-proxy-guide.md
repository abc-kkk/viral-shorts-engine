# 🚀 零成本防封黑科技：Codespace + WARP 纯净美国 IP 部署全流程指南（小白保姆级）

做 AI 短剧自动化时，最让人崩溃的就是因为 IP 不纯净，导致频繁弹出 Google 的人机验证（UNUSUAL_ACTIVITY），甚至直接封号。买原生的美国住宅 IP 又非常昂贵。

这份文档将手把手教你如何**完全免费地白嫖 GitHub 的服务器（Codespace）**，在里面装上 Cloudflare WARP，并把这根**拥有纯净美国原生 IP 的高速网线**，直接“拉”到你自己的电脑上！

哪怕你完全不懂技术代码，只要跟着下面的图文步骤一步步复制粘贴，10分钟内就能拥有属于你的千万级防封工作室网络！

---

## 🟢 准备工作

在开始之前，你需要准备好：
1. **一台本地电脑**（Windows 或 Mac 都可以）。
2. 在电脑上安装好小工具 **GitHub CLI (`gh`)**：
   - Mac 用户在终端执行：`brew install gh`
   - Windows 用户在终端执行：`winget install --id GitHub.cli`
3. 执行 `gh auth login` 按照屏幕提示在浏览器里登录你的 GitHub 账号。

---

## ⚡️ 极速通道：一键全自动部署 (强烈推荐！)

为了彻底解放双手，我们已经为你写好了一个**一键全自动部署脚本**！只要你完成了上面的准备工作，进入项目的 `web` 目录并执行脚本即可：

- **Windows 用户**：直接双击运行文件夹里的 `auto-setup-proxy.bat`，或者在命令提示符执行：
  ```cmd
  cd web
  auto-setup-proxy.bat
  ```

- **Mac / Linux 用户**：在终端里执行：
  ```bash
  cd web
  ./auto-setup-proxy.sh
  ```

**喝口水的时间，脚本就会全自动帮你：**去美国买云电脑 -> 在云端安装 WARP -> 建立加密通道 -> 在你的本机开启 1081 代理端口！
当终端提示大功告成后，你只需要跳到**第三阶段**去配置一下浏览器的 SwitchyOmega 就可以直接开刷了！

> 如果脚本执行失败，或者你更喜欢“亲手组装跑车”的快感，请往下看**手动图文教程** 👇

---

## 第一阶段：在云端打造你的“超级跳板机”

这一步，我们将去 GitHub 免费开一台位于美国的云电脑，并在里面安装好 Cloudflare WARP。

### 第 1 步：免费领一台 GitHub 云电脑 (Codespace)
1. 登录你的 GitHub 账号。
2. 随便找一个你的代码仓库（如果没有，点击右上角的 `+` -> `New repository` 随便新建一个空的）。
3. 在仓库页面，点击绿色的 **`<> Code`** 按钮。
4. 切换到 **`Codespaces`** 选项卡。
5. 点击绿色的 **`Create codespace on main`**。
6. 耐心等待 1-2 分钟，网页里会打开一个长得像 VS Code 编程软件的界面，这就是你的免费美国云电脑！

### 第 2 步：在云电脑里安装 WARP (核心！)
云电脑默认的 IP 是微软机房 IP，依然会被 Google 拦截。我们需要给它套上 WARP 铠甲。
在刚刚打开的云电脑界面最下方，找到**终端黑框框 (Terminal)**。

> **💡 小白注意：** 接下来的每一行代码，你只需要复制它，然后在黑框框里粘贴，按回车即可。如果问你 `[Y/n]`，就输入 `Y` 回车。

依次执行下面 3 步命令（一行一行来，等上一行跑完了再复制下一行）：

1️⃣ **下载 Cloudflare 的官方密钥和安装包**
```bash
curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
```

2️⃣ **更新系统并安装 WARP**
```bash
sudo apt-get update && sudo apt-get install cloudflare-warp -y
```

3️⃣ **注册并连接 WARP 网络**
```bash
# 启动后台服务
sudo warp-svc --accept-tos > /dev/null 2>&1 &

# 注册账号并连接
warp-cli --accept-tos register
warp-cli --accept-tos set-mode proxy
warp-cli --accept-tos set-proxy-port 40000
warp-cli --accept-tos connect
```

> **🎉 测试是否成功：**
> 在黑框框里输入 `curl -x socks5://127.0.0.1:40000 ipinfo.io` 并回车。如果返回的信息里出现了 `"org": "AS13335 Cloudflare, Inc."`，恭喜你，你的云电脑已经披上了完美的隐形铠甲！

---

## 第二阶段：把这根网线“拉”回你的本地电脑

云电脑配好了，但我们得让**你放在桌子上的这台实体电脑**用上它的网络。

### 第 1 步：在你的实体电脑上安装 GitHub CLI
为了能安全地连接到云电脑，我们需要装一个小工具 `gh`。

- **Mac 用户**：打开你电脑上的终端 (Terminal)，输入 `brew install gh` 回车。
- **Windows 用户**：打开命令提示符 (cmd) 或 PowerShell，输入 `winget install --id GitHub.cli` 回车。

### 第 2 步：登录你的账号
安装完成后，在终端输入：
```bash
gh auth login
```
系统会问你几个问题，请直接一路按回车选择默认选项（默认选 `GitHub.com` -> `HTTPS` -> `Y` -> `Login with a web browser`）。
然后系统会弹出一个网页，并且在终端显示一串由数字和字母组成的验证码（比如 `0123-ABCD`）。把这串代码填进网页里，点击授权 (Authorize)。

### 第 3 步：一键开启时空隧道！
这是最激动人心的一步。我们需要知道你刚才建的那台云电脑叫什么名字。
在你的终端里输入：
```bash
gh cs list
```
你会看到一个列表，里面有个名字很奇特的英文单词组合（比如 `cautious-space-adventure-qwjj6x`），这就是你的 Codespace ID。把它复制下来。

然后，敲下这行**神仙指令**（注意替换你自己的 ID）：
```bash
gh cs ssh -c 填入你的Codespace_ID -- -L 1081:127.0.0.1:40000
```
*(如果是按我们的源码跑项目，可以直接编辑并运行项目里的 `start-proxy.sh` 脚本，原理是一样的！)*

> **⚠️ 绝对禁忌：**
> 这行代码敲下去并登录成功后，**这个黑框框就绝对不能关**！关了桥就塌了！只要它开着，你的电脑上就多了一个超级纯净的美国 IP 出口，它的地址就是 `127.0.0.1`，端口是 `1081`。

---

## 第三阶段：让浏览器吃上这口“纯净网络”

隧道已经修通，最后一步就是让你的浏览器走这条隧道。

### 第 1 步：给浏览器安装 SwitchyOmega 插件
1. 打开你要跑自动化的那个 Chrome 浏览器。
2. 在扩展商店搜索 `SwitchyOmega` 并安装。

### 第 2 步：配置纯净出口
1. 点击 SwitchyOmega 插件图标，进入**选项 (Options)**。
2. 点击左侧的 `proxy` 情景模式。
3. 把代理协议改成 **`SOCKS5`**。
4. 代理服务器填入：**`127.0.0.1`**
5. 端口填入：**`1081`**
6. 点击左下角的 **应用选项 (Apply changes)** 绿色按钮保存。

### 🚀 终极测试：
1. 点击浏览器右上角的 SwitchyOmega 图标，选择刚才配置的 `proxy` 模式。
2. 打开一个查 IP 的网站（例如 `ip138.com` 或 `ipinfo.io`）。
3. 如果显示你的 IP 在美国，而且运营商是 Cloudflare。

**大功告成！** 你现在可以随意去跑那些会封人的 Google 大模型了，你拥有的是最顶级的隐形网线！

---
> 💡 **日常复活小贴士（必看！）**
> GitHub 的免费云电脑如果太久不用会自动休眠。
> 每天开工前，如果你发现隧道连不上了，只需要去 GitHub 网页把那台 Codespace 重新唤醒。唤醒后，记得在网页的黑框框里执行一句 `nohup sudo warp-svc --accept-tos > /dev/null 2>&1 &` 重新拉起 WARP 进程，然后再在本地电脑跑第二阶段的隧道指令即可光速复活！
