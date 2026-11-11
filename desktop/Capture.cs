using System;
using System.Drawing;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace DeepSeekHarnessDesktop
{
    internal static class Capture
    {
        private static string outputDir;
        private static string baseUrl;
        private static string projectId;
        private static string taskId;
        private static WebView2 view;
        private static Form form;

        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                Console.OutputEncoding = Encoding.UTF8;
                outputDir = args.Length > 0 ? Path.GetFullPath(args[0]) : Path.Combine(Paths.BaseDir, "preview");
                Directory.CreateDirectory(outputDir);
                Launcher.Start(true);
                baseUrl = Launcher.BaseUrl;

                string state = Launcher.HttpGet(baseUrl + "/api/state", 5000);
                Match project = Regex.Match(state, "\"projects\":\\[\\{\"id\":\"([^\"]+)\"");
                Match task = Regex.Match(state, "\"tasks\":\\[\\{\"id\":\"([^\"]+)\"");
                if (project.Success) projectId = project.Groups[1].Value;
                if (task.Success) taskId = task.Groups[1].Value;
                Console.WriteLine("project: " + (projectId ?? "none") + "  task: " + (taskId ?? "none"));

                Application.EnableVisualStyles();
                form = new Form();
                form.Text = "Capture";
                form.ClientSize = new Size(1440, 1000);
                form.StartPosition = FormStartPosition.Manual;
                form.Location = new Point(0, 0);
                form.ShowInTaskbar = false;
                form.FormBorderStyle = FormBorderStyle.None;
                form.BackColor = Color.FromArgb(10, 12, 17);
                form.TopMost = true;

                view = new WebView2();
                view.Dock = DockStyle.Fill;
                view.DefaultBackgroundColor = Color.FromArgb(10, 12, 17);
                form.Controls.Add(view);

                form.Shown += async (sender, eventArgs) =>
                {
                    try
                    {
                        await RunCapturesAsync();
                        Console.WriteLine("CAPTURE OK");
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine("CAPTURE FAILED: " + ex);
                    }
                    finally
                    {
                        try { form.Close(); } catch { }
                    }
                };

                Application.Run(form);
                Launcher.Stop();
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("CAPTURE FAILED: " + ex);
                Launcher.Stop();
                return 1;
            }
        }

        private static async Task RunCapturesAsync()
        {
            var options = new CoreWebView2EnvironmentOptions("--no-sandbox --disable-gpu --disable-gpu-compositing");
            var environment = await CoreWebView2Environment.CreateAsync(null, Paths.WebViewData, options);
            await view.EnsureCoreWebView2Async(environment);
            Console.WriteLine("webview ready");

            var pages = new System.Collections.Generic.List<string[]>();
            pages.Add(new string[] { "home", "#/projects" });
            if (projectId != null)
            {
                pages.Add(new string[] { "overview", "#/project/" + projectId });
                pages.Add(new string[] { "requirements", "#/project/" + projectId + "/requirements" });
                pages.Add(new string[] { "build", "#/project/" + projectId + "/build" });
            }
            if (taskId != null) pages.Add(new string[] { "task", "#/task/" + taskId });

            foreach (string[] page in pages)
            {
                await NavigateAsync(baseUrl + "/" + page[1]);
                await Task.Delay(1300);
                await SaveAsync(Path.Combine(outputDir, page[0] + ".png"));
                Console.WriteLine("captured " + page[0]);
            }

            if (projectId != null)
            {
                await NavigateAsync(baseUrl + "/#/project/" + projectId);
                await Task.Delay(900);
                await view.CoreWebView2.ExecuteScriptAsync("document.querySelector('#api-status') && document.querySelector('#api-status').click();");
                await Task.Delay(600);
                await SaveAsync(Path.Combine(outputDir, "settings.png"));
                Console.WriteLine("captured settings");
            }
        }

        private static Task NavigateAsync(string url)
        {
            var completion = new TaskCompletionSource<bool>();
            EventHandler<CoreWebView2NavigationCompletedEventArgs> handler = null;
            handler = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                view.CoreWebView2.NavigationCompleted -= handler;
                completion.TrySetResult(args.IsSuccess);
            };
            view.CoreWebView2.NavigationCompleted += handler;
            view.CoreWebView2.Navigate(url);
            return completion.Task;
        }

        private static async Task SaveAsync(string path)
        {
            using (var stream = File.Create(path))
            {
                await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
            }
        }
    }
}
