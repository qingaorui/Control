using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Win32;

namespace DeepSeekHarnessDesktop
{
    internal static class Paths
    {
        public static readonly string BaseDir = AppDomain.CurrentDomain.BaseDirectory;
        public static readonly string RuntimeDir = Path.Combine(BaseDir, "runtime");
        public static readonly string AppDir = Path.Combine(RuntimeDir, "app");
        public static readonly string NodeExe = Path.Combine(RuntimeDir, "node.exe");
        public static readonly string ServerJs = Path.Combine(AppDir, "server.js");

        public static readonly string UserDataRoot = ResolveUserDataRoot();
        public static readonly string DataDir = ResolveDataDir();
        public static readonly string WebViewData = Path.Combine(UserDataRoot, "webview2");
        public static readonly string LogsDir = Path.Combine(UserDataRoot, "logs");
        public static readonly string ServerLog = Path.Combine(LogsDir, "server.log");
        public static readonly string LauncherLog = Path.Combine(LogsDir, "launcher.log");
        public static readonly string UrlFile = Path.Combine(DataDir, "server.url");

        private static bool TryPrepare(string path)
        {
            if (string.IsNullOrEmpty(path)) return false;
            try
            {
                Directory.CreateDirectory(path);
                string probe = Path.Combine(path, ".dsh-write-test");
                File.WriteAllText(probe, "ok");
                File.Delete(probe);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static string ResolveUserDataRoot()
        {
            string fromEnv = Environment.GetEnvironmentVariable("DSH_USER_DATA_DIR");
            if (TryPrepare(fromEnv)) return fromEnv;

            var candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DeepSeek Harness Console"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DeepSeek Harness Console"),
                Path.Combine(BaseDir, "user-data"),
                Path.Combine(ProjectRoot, ".dsh-console-data")
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (TryPrepare(candidates[i])) return candidates[i];
            }
            return candidates[0];
        }

        private static string ResolveDataDir()
        {
            string fromEnv = Environment.GetEnvironmentVariable("DSH_DATA_DIR");
            if (TryPrepare(fromEnv)) return fromEnv;
            string fallback = Path.Combine(UserDataRoot, "data");
            if (TryPrepare(fallback)) return fallback;
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "DeepSeek Harness Console", "data");
        }

        public static string ProjectRoot
        {
            get
            {
                string fromEnv = Environment.GetEnvironmentVariable("DSH_PROJECT_ROOT");
                if (!string.IsNullOrEmpty(fromEnv)) return fromEnv;
                return @"D:\dscontrol";
            }
        }
    }

    internal static class Launcher
    {
        private static readonly object LogLock = new object();
        private static Process nodeProcess;

        public static string BaseUrl { get; private set; }

        public static void Start(bool redirect = true)
        {
            if (!File.Exists(Paths.NodeExe))
                throw new Exception("缺少内置运行时：\r\n" + Paths.NodeExe);
            if (!File.Exists(Paths.ServerJs))
                throw new Exception("缺少控制台服务文件：\r\n" + Paths.ServerJs);

            Directory.CreateDirectory(Paths.DataDir);
            Directory.CreateDirectory(Paths.LogsDir);
            Directory.CreateDirectory(Paths.UserDataRoot);
            try { Directory.CreateDirectory(Paths.ProjectRoot); } catch { }

            int port = GetPreferredPort();
            BaseUrl = "http://127.0.0.1:" + port.ToString();

            try
            {
                File.WriteAllText(
                    Paths.ServerLog,
                    "=== DeepSeek Harness Console " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " ===\r\n",
                    new UTF8Encoding(true));
            }
            catch { }

            var info = new ProcessStartInfo();
            info.FileName = Paths.NodeExe;
            info.Arguments = "\"" + Paths.ServerJs + "\"";
            info.WorkingDirectory = Paths.AppDir;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            info.EnvironmentVariables["DSH_DATA_DIR"] = Paths.DataDir;
            info.EnvironmentVariables["DSH_PROJECT_ROOT"] = Paths.ProjectRoot;
            info.EnvironmentVariables["DSH_CONSOLE_PORT"] = port.ToString();
            info.EnvironmentVariables["DSH_DESKTOP"] = "1";

            if (redirect)
            {
                info.RedirectStandardOutput = true;
                info.RedirectStandardError = true;
            }

            var process = new Process();
            process.StartInfo = info;
            process.EnableRaisingEvents = true;
            if (redirect)
            {
                process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs args)
                {
                    if (args.Data != null) AppendLog(args.Data);
                };
                process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args)
                {
                    if (args.Data != null) AppendLog("[stderr] " + args.Data);
                };
            }

            if (!process.Start()) throw new Exception("无法启动本地服务进程。");
            nodeProcess = process;
            if (redirect)
            {
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
            }

            WaitForHealth(25000);
            TryWriteUrlFile();
            AppendLog("desktop ready: " + BaseUrl);
        }

        public static void Stop()
        {
            TryDeleteUrlFile();
            var process = nodeProcess;
            nodeProcess = null;
            if (process == null) return;
            try
            {
                if (!process.HasExited)
                {
                    try
                    {
                        var kill = new ProcessStartInfo();
                        kill.FileName = "taskkill.exe";
                        kill.Arguments = "/PID " + process.Id + " /T /F";
                        kill.UseShellExecute = false;
                        kill.CreateNoWindow = true;
                        Process.Start(kill);
                        process.WaitForExit(2500);
                    }
                    catch
                    {
                        process.Kill();
                        process.WaitForExit(2500);
                    }
                }
            }
            catch { }
            try { process.Dispose(); } catch { }
        }

        public static string TailLog(int lines)
        {
            try
            {
                if (!File.Exists(Paths.ServerLog)) return "";
                string[] all = File.ReadAllLines(Paths.ServerLog);
                int start = Math.Max(0, all.Length - lines);
                var builder = new StringBuilder();
                for (int i = start; i < all.Length; i++) builder.AppendLine(all[i]);
                return builder.ToString();
            }
            catch { return ""; }
        }

        public static string HttpGet(string url, int timeoutMs)
        {
            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Timeout = timeoutMs;
            request.ReadWriteTimeout = timeoutMs;
            request.Proxy = null;
            request.KeepAlive = false;
            using (var response = (HttpWebResponse)request.GetResponse())
            using (var stream = response.GetResponseStream())
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                return reader.ReadToEnd();
            }
        }

        public static void HttpPost(string url, string body)
        {
            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "POST";
            request.ContentType = "application/json";
            request.Timeout = 10000;
            request.Proxy = null;
            byte[] bytes = Encoding.UTF8.GetBytes(body ?? "{}");
            request.ContentLength = bytes.Length;
            using (var stream = request.GetRequestStream()) stream.Write(bytes, 0, bytes.Length);
            using (var response = (HttpWebResponse)request.GetResponse())
            using (var stream = response.GetResponseStream())
            using (var reader = new StreamReader(stream, Encoding.UTF8)) reader.ReadToEnd();
        }

        private static void TryWriteUrlFile()
        {
            try
            {
                Directory.CreateDirectory(Paths.DataDir);
                File.WriteAllText(Paths.UrlFile, BaseUrl, Encoding.UTF8);
            }
            catch { }
        }

        private static void TryDeleteUrlFile()
        {
            try { if (File.Exists(Paths.UrlFile)) File.Delete(Paths.UrlFile); } catch { }
        }

        private static void AppendLog(string line)
        {
            if (string.IsNullOrEmpty(line)) return;
            try
            {
                lock (LogLock)
                {
                    File.AppendAllText(
                        Paths.ServerLog,
                        DateTime.Now.ToString("HH:mm:ss.fff") + "  " + line + "\r\n",
                        new UTF8Encoding(true));
                }
            }
            catch { }
        }

        private static int GetPreferredPort()
        {
            for (int port = 43180; port < 43200; port++)
            {
                var listener = new TcpListener(IPAddress.Loopback, port);
                try
                {
                    listener.Start();
                    listener.Stop();
                    return port;
                }
                catch
                {
                    try { listener.Stop(); } catch { }
                }
            }
            return GetFreePort();
        }

        private static int GetFreePort()
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try { return ((IPEndPoint)listener.LocalEndpoint).Port; }
            finally { listener.Stop(); }
        }

        private static void WaitForHealth(int timeoutMs)
        {
            DateTime deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
            Exception last = null;
            while (DateTime.UtcNow < deadline)
            {
                if (nodeProcess != null && nodeProcess.HasExited)
                {
                    throw new Exception(
                        "本地服务进程提前退出（代码 " + nodeProcess.ExitCode + "）。\r\n\r\n日志：\r\n" + TailLog(30));
                }
                try
                {
                    string body = HttpGet(BaseUrl + "/api/health", 1200);
                    if (body.Contains("\"ok\":true")) return;
                }
                catch (Exception ex) { last = ex; }
                Thread.Sleep(180);
            }
            throw new Exception(
                "等待本地服务启动超时。" + (last != null ? "\r\n" + last.Message : "") +
                "\r\n\r\n日志：\r\n" + TailLog(30));
        }
    }

    internal static class Browser
    {
        public static bool Open(string url, string mode = "browser")
        {
            if (mode == "app")
            {
                string browser = FindBrowser();
                if (!string.IsNullOrEmpty(browser))
                {
                    try
                    {
                        var info = new ProcessStartInfo();
                        info.FileName = browser;
                        info.Arguments = "--app=" + url + " --window-size=1440,960";
                        info.UseShellExecute = true;
                        Process.Start(info);
                        Program.Log("browser app window: " + browser + " " + url);
                        return true;
                    }
                    catch (Exception ex)
                    {
                        Program.Log("browser app window failed: " + ex.Message);
                    }
                }
            }
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                Program.Log("browser local window: " + url);
                return true;
            }
            catch (Exception ex)
            {
                Program.Log("browser local window failed: " + ex.Message);
            }
            if (mode != "app")
            {
                string browser = FindBrowser();
                if (!string.IsNullOrEmpty(browser))
                {
                    try
                    {
                        var info = new ProcessStartInfo();
                        info.FileName = browser;
                        info.Arguments = "--app=" + url + " --window-size=1440,960";
                        info.UseShellExecute = true;
                        Process.Start(info);
                        Program.Log("browser app fallback: " + browser + " " + url);
                        return true;
                    }
                    catch (Exception ex)
                    {
                        Program.Log("browser app fallback failed: " + ex.Message);
                    }
                }
            }
            return false;
        }

        private static string FindBrowser()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe")
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (File.Exists(candidates[i])) return candidates[i];
            }
            return null;
        }
    }

    internal sealed class MainForm : Form
    {
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        private const int DwmUseImmersiveDarkMode = 20;
        private const int DwmCaptionColor = 35;
        private const int DwmTextColor = 36;
        private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string RunValue = "DeepSeekHarnessConsole";

        private WebView2 webView;
        private NotifyIcon tray;
        private ToolStripMenuItem autoStartItem;
        private bool initialized;
        private bool exiting;
        private bool silent;
        private bool hiddenOnce;

        public MainForm(bool silent)
        {
            this.silent = silent;
            Text = "DeepSeek Harness 控制台";
            ClientSize = new Size(1440, 940);
            MinimumSize = new Size(1000, 680);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(247, 247, 245);
            ForeColor = Color.FromArgb(243, 243, 243);
            KeyPreview = true;
            DoubleBuffered = true;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            BuildTray();
            Shown += OnShown;
            FormClosing += OnFormClosing;
            FormClosed += OnFormClosed;
            KeyDown += OnKeyDown;
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try
            {
                int dark = 0;
                DwmSetWindowAttribute(Handle, DwmUseImmersiveDarkMode, ref dark, sizeof(int));
                int caption = 0x00F7F7F5;
                DwmSetWindowAttribute(Handle, DwmCaptionColor, ref caption, sizeof(int));
                int text = 0x001B1B1B;
                DwmSetWindowAttribute(Handle, DwmTextColor, ref text, sizeof(int));
            }
            catch { }
        }

        private async void OnShown(object sender, EventArgs e)
        {
            if (initialized) return;
            initialized = true;
            try
            {
                await InitializeWebViewAsync();
                if (silent)
                {
                    BeginInvoke((Action)HideToTray);
                }
                else
                {
                    tray.ShowBalloonTip(2200, "DeepSeek Harness 控制台",
                        "主界面在应用窗口；点击对话会在外部浏览器窗口打开。", ToolTipIcon.Info);
                }
            }
            catch (Exception ex)
            {
                Program.Log("webview init failed: " + ex.Message);
                DialogResult choice = MessageBox.Show(
                    this,
                    "内置界面初始化失败。\r\n\r\n" + ex.Message +
                    "\r\n\r\n可以改用外部浏览器打开主界面，对话仍会单独打开。\r\n日志：" + Paths.LauncherLog,
                    "DeepSeek Harness 控制台",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning);
                if (choice == DialogResult.Yes)
                {
                    Browser.Open(Launcher.BaseUrl + "/?shell=1", "browser");
                    HideToTray();
                }
                else
                {
                    ExitApplication();
                }
            }
        }

        private async System.Threading.Tasks.Task InitializeWebViewAsync()
        {
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.DefaultBackgroundColor = Color.FromArgb(247, 247, 245);
            Controls.Add(webView);
            webView.BringToFront();

            var environment = await CoreWebView2Environment.CreateAsync(null, Paths.WebViewData, null);
            await webView.EnsureCoreWebView2Async(environment);

            CoreWebView2 core = webView.CoreWebView2;
            core.Settings.AreDevToolsEnabled = true;
            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;
            core.Settings.IsZoomControlEnabled = true;

            core.WebMessageReceived += OnWebMessageReceived;
            core.NewWindowRequested += OnNewWindowRequested;
            core.NavigationStarting += OnNavigationStarting;
            core.DocumentTitleChanged += OnDocumentTitleChanged;
            core.DownloadStarting += OnDownloadStarting;

            webView.Source = new Uri(Launcher.BaseUrl + "/?shell=1");
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            string message = null;
            try { message = e.TryGetWebMessageAsString(); } catch { }
            if (string.IsNullOrEmpty(message)) return;
            string mode = "browser";
            int separator = message.IndexOf('|');
            if (separator > 0)
            {
                mode = message.Substring(0, separator);
                message = message.Substring(separator + 1);
            }
            if (mode == "dsh")
            {
                if (!IsLocalUrl(message)) return;
            }
            else
            {
                if (!message.StartsWith(Launcher.BaseUrl, StringComparison.OrdinalIgnoreCase)) return;
                if (message.IndexOf("dialog=1", StringComparison.OrdinalIgnoreCase) < 0) return;
            }
            bool opened = Browser.Open(message, mode);
            Program.Log("dialog open " + (opened ? "ok" : "failed") + " mode=" + mode + " " + message);
            if (!opened)
            {
                MessageBox.Show(
                    "无法打开浏览器对话窗口。\r\n\r\n请手动访问：\r\n" + message,
                    "DeepSeek Harness 控制台",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
            }
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            Browser.Open(e.Uri, "browser");
        }

        private static bool IsLocalUrl(string url)
        {
            Uri uri;
            if (!Uri.TryCreate(url, UriKind.Absolute, out uri)) return false;
            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;
            return uri.IsLoopback ||
                string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase);
        }

        private void OnNavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
        {
            if (string.IsNullOrEmpty(e.Uri)) return;
            if (e.Uri.StartsWith(Launcher.BaseUrl, StringComparison.OrdinalIgnoreCase)) return;
            if (e.Uri.Equals("about:blank", StringComparison.OrdinalIgnoreCase)) return;
            e.Cancel = true;
            try { Process.Start(new ProcessStartInfo(e.Uri) { UseShellExecute = true }); } catch { }
        }

        private void OnDocumentTitleChanged(object sender, object e)
        {
            try
            {
                if (webView != null && webView.CoreWebView2 != null && !string.IsNullOrEmpty(webView.CoreWebView2.DocumentTitle))
                    Text = webView.CoreWebView2.DocumentTitle;
            }
            catch { }
        }

        private void OnDownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e)
        {
            try
            {
                string downloads = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
                Directory.CreateDirectory(downloads);
                string name = Path.GetFileName(e.ResultFilePath);
                if (string.IsNullOrEmpty(name)) name = "DeepSeekHarness-download";
                e.ResultFilePath = Path.Combine(downloads, name);
            }
            catch { }
        }

        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.F11)
            {
                WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.F12)
            {
                if (webView != null && webView.CoreWebView2 != null) webView.CoreWebView2.OpenDevToolsWindow();
                e.Handled = true;
            }
        }

        private void BuildTray()
        {
            var menu = new ContextMenuStrip();
            var show = new ToolStripMenuItem("显示应用界面", null, delegate { ShowMain(); });
            show.Font = new Font(show.Font, FontStyle.Bold);
            menu.Items.Add(show);
            menu.Items.Add(new ToolStripMenuItem("打开工作区", null, delegate { OpenWorkspace(); }));
            menu.Items.Add(new ToolStripMenuItem("打开日志", null, delegate { OpenLog(); }));
            menu.Items.Add(new ToolStripSeparator());
            autoStartItem = new ToolStripMenuItem("开机自动启动", null, delegate { ToggleAutoStart(); });
            autoStartItem.Checked = IsAutoStartEnabled();
            menu.Items.Add(autoStartItem);
            menu.Items.Add(new ToolStripMenuItem("创建桌面快捷方式", null, delegate { CreateDesktopShortcut(); }));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(new ToolStripMenuItem("退出", null, delegate { ExitApplication(); }));

            tray = new NotifyIcon();
            tray.Icon = LoadIcon();
            tray.Text = "DeepSeek Harness 控制台";
            tray.ContextMenuStrip = menu;
            tray.Visible = true;
            tray.DoubleClick += delegate { ShowMain(); };
        }

        public void ShowMain()
        {
            if (IsDisposed) return;
            Show();
            if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
            Activate();
            BringToFront();
        }

        private void HideToTray()
        {
            if (IsDisposed) return;
            Hide();
            if (!hiddenOnce)
            {
                hiddenOnce = true;
                tray.ShowBalloonTip(2000, "DeepSeek Harness 控制台",
                    "应用已最小化到托盘。双击托盘图标可重新打开。", ToolTipIcon.Info);
            }
        }

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (exiting) return;
            e.Cancel = true;
            HideToTray();
        }

        private void OnFormClosed(object sender, FormClosedEventArgs e)
        {
            try
            {
                if (tray != null)
                {
                    tray.Visible = false;
                    tray.Dispose();
                }
            }
            catch { }
            Launcher.Stop();
        }

        private void ExitApplication()
        {
            if (exiting) return;
            exiting = true;
            try { if (tray != null) tray.Visible = false; } catch { }
            Launcher.Stop();
            Close();
            Application.Exit();
        }

        private void OpenWorkspace()
        {
            try
            {
                Launcher.HttpPost(Launcher.BaseUrl + "/api/workspace/open", "{}");
            }
            catch
            {
                try
                {
                    Directory.CreateDirectory(Paths.ProjectRoot);
                    Process.Start("explorer.exe", Paths.ProjectRoot);
                }
                catch (Exception ex)
                {
                    MessageBox.Show(ex.Message, "打开工作区", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
        }

        private void OpenLog()
        {
            try
            {
                string file = File.Exists(Paths.ServerLog) ? Paths.ServerLog : Paths.LauncherLog;
                if (!File.Exists(file))
                    MessageBox.Show("日志文件尚未生成：\r\n" + Paths.LogsDir, "日志", MessageBoxButtons.OK, MessageBoxIcon.Information);
                else
                    Process.Start("notepad.exe", "\"" + file + "\"");
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "打开日志", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private bool IsAutoStartEnabled()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey, false))
                {
                    return key != null && key.GetValue(RunValue) != null;
                }
            }
            catch { return false; }
        }

        private void ToggleAutoStart()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(RunKey))
                {
                    if (IsAutoStartEnabled())
                    {
                        key.DeleteValue(RunValue, false);
                        autoStartItem.Checked = false;
                        tray.ShowBalloonTip(1600, "已关闭开机启动", "", ToolTipIcon.Info);
                    }
                    else
                    {
                        key.SetValue(RunValue, "\"" + Application.ExecutablePath + "\" --silent", RegistryValueKind.String);
                        autoStartItem.Checked = true;
                        tray.ShowBalloonTip(1600, "已开启开机启动", "下次登录 Windows 时后台运行。", ToolTipIcon.Info);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "开机启动", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void CreateDesktopShortcut()
        {
            try
            {
                string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "DeepSeek Harness 控制台.lnk");
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) throw new Exception("WScript.Shell 不可用");
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { path });
                Type shortcutType = shortcut.GetType();
                shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { Application.ExecutablePath });
                shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { Paths.BaseDir });
                shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { Application.ExecutablePath + ",0" });
                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "DeepSeek Harness 控制台" });
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                tray.ShowBalloonTip(1600, "快捷方式已创建", path, ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "创建快捷方式", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static Icon LoadIcon()
        {
            try
            {
                Icon icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (icon != null) return icon;
            }
            catch { }
            return SystemIcons.Application;
        }
    }

    internal static class Program
    {
        private const string ShowEventName = "DeepSeekHarnessConsole.ShowWindow";

        internal static void Log(string message)
        {
            try
            {
                Directory.CreateDirectory(Paths.LogsDir);
                lock (typeof(Program))
                {
                    File.AppendAllText(
                        Paths.LauncherLog,
                        DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "  " + message + "\r\n",
                        new UTF8Encoding(true));
                }
            }
            catch { }
        }

        [STAThread]
        private static void Main(string[] args)
        {
            bool silent = Array.IndexOf(args, "--silent") >= 0;
            Log("launcher start silent=" + silent.ToString());
            bool createdNew;
            using (var mutex = new Mutex(true, "DeepSeekHarnessConsole.SingleInstance", out createdNew))
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                if (!createdNew)
                {
                    Log("existing instance, signal show");
                    try
                    {
                        using (var ev = new EventWaitHandle(false, EventResetMode.AutoReset, ShowEventName))
                        {
                            ev.Set();
                            Thread.Sleep(120);
                            ev.Set();
                        }
                    }
                    catch { }
                    return;
                }

                Application.ApplicationExit += delegate { Launcher.Stop(); };
                AppDomain.CurrentDomain.UnhandledException += delegate { Launcher.Stop(); };

                try
                {
                    Launcher.Start(true);
                    Log("server started " + Launcher.BaseUrl);
                }
                catch (Exception ex)
                {
                    Log("server start failed: " + ex.Message);
                    MessageBox.Show(
                        "本地服务启动失败。\r\n\r\n" + ex.Message +
                        "\r\n\r\n数据目录：" + Paths.DataDir +
                        "\r\n日志文件：" + Paths.ServerLog,
                        "DeepSeek Harness 控制台",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }

                var form = new MainForm(silent);
                var showThread = new Thread(delegate()
                {
                    try
                    {
                        using (var ev = new EventWaitHandle(false, EventResetMode.AutoReset, ShowEventName))
                        {
                            while (true)
                            {
                                ev.WaitOne();
                                if (form.IsDisposed) break;
                                try { form.BeginInvoke((Action)form.ShowMain); } catch { break; }
                            }
                        }
                    }
                    catch { }
                });
                showThread.IsBackground = true;
                showThread.Start();

                Application.Run(form);
            }
        }
    }
}
