using System;
using System.Text;

namespace DeepSeekHarnessDesktop
{
    internal static class SelfTest
    {
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                Console.OutputEncoding = Encoding.UTF8;
                Console.WriteLine("app dir      : " + Paths.BaseDir);
                Console.WriteLine("runtime dir  : " + Paths.RuntimeDir);
                Console.WriteLine("node         : " + Paths.NodeExe + " (" + (System.IO.File.Exists(Paths.NodeExe) ? "found" : "MISSING") + ")");
                Console.WriteLine("server       : " + Paths.ServerJs + " (" + (System.IO.File.Exists(Paths.ServerJs) ? "found" : "MISSING") + ")");
                Console.WriteLine("browser mode : external app window / default browser");

                Launcher.Start(false);
                Console.WriteLine("server url   : " + Launcher.BaseUrl);

                string health = Launcher.HttpGet(Launcher.BaseUrl + "/api/health", 5000);
                Console.WriteLine("health       : " + (health.Contains("\"ok\":true") ? "OK" : health));

                string state = Launcher.HttpGet(Launcher.BaseUrl + "/api/state", 5000);
                Console.WriteLine("state        : " + (state.Contains("\"projects\"") ? "OK (" + state.Length + " chars)" : "BAD"));

                string html = Launcher.HttpGet(Launcher.BaseUrl + "/", 5000);
                Console.WriteLine("ui           : " + (html.Contains("DeepSeek Harness") ? "OK" : "BAD"));

                Launcher.Stop();
                Console.WriteLine("SELFTEST OK");
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("SELFTEST FAILED");
                Console.Error.WriteLine(ex.ToString());
                Launcher.Stop();
                return 1;
            }
        }
    }
}
