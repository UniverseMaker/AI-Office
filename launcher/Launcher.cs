// AI OFFICE 서버 실행기 — 실행 파일 하나로 GUI + 명령줄.
//   AI-OFFICE.exe                 → 창(GUI)
//   AI-OFFICE.exe start|stop|restart|status|run|config|open|logs|set-admin|help   → 명령줄
// .NET Framework 4.8(WPF) — Windows 10/11 에 기본으로 있어 따로 설치할 것이 없다. 빌드: launcher\build.cmd
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Threading;
using WF = System.Windows.Forms;
using Ellipse = System.Windows.Shapes.Ellipse;

[assembly: AssemblyTitle("AI OFFICE 서버 실행기")]
[assembly: AssemblyProduct("AI OFFICE")]
[assembly: AssemblyVersion("6.0.0.0")]
[assembly: AssemblyFileVersion("6.0.0.0")]

namespace AiOffice
{
    // ------------------------------------------------------------------ 설정 · 서버 제어 (GUI · CLI 공용)
    public sealed class ServerStatus
    {
        public bool Running, Responding, Legacy;
        public int Pid, Port, Sessions, Busy, Urgent;
        public string Host = "127.0.0.1";
        public long Started;
        public double MemMB;
    }

    public sealed class Core
    {
        public readonly string Root, Data, ServerFile, LauncherFile, PidFile, KeyFile, LogFile, AuthFile;
        static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
        public const int DefaultPort = 17777;

        public Core(string root)
        {
            Root = root;
            var env = Environment.GetEnvironmentVariable("AI_OFFICE_DATA_DIR");
            Data = string.IsNullOrEmpty(env) ? Path.Combine(root, "data") : Path.GetFullPath(env);
            ServerFile = Path.Combine(Data, "server.json");
            LauncherFile = Path.Combine(Data, "launcher.json");
            PidFile = Path.Combine(Data, "server.pid");
            KeyFile = Path.Combine(Data, "launcher.key");
            LogFile = Path.Combine(root, "ai-office.log");
            AuthFile = Path.Combine(Data, "auth.json");
        }

        /// 실행 파일이 있는 폴더(또는 그 위)에서 server\index.mjs 를 찾는다
        public static string FindRoot(string hint)
        {
            var cands = new List<string>();
            if (!string.IsNullOrEmpty(hint)) cands.Add(hint);
            var exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            cands.Add(exeDir); cands.Add(Path.GetDirectoryName(exeDir) ?? exeDir); cands.Add(Environment.CurrentDirectory);
            foreach (var c in cands) if (c != null && File.Exists(Path.Combine(c, "server", "index.mjs"))) return Path.GetFullPath(c);
            return null;
        }

        // ---------------- JSON 파일
        public static Dictionary<string, object> ReadJson(string f)
        {
            try { var o = Json.DeserializeObject(File.ReadAllText(f, Encoding.UTF8)) as Dictionary<string, object>; if (o != null) return o; } catch { }
            return new Dictionary<string, object>();
        }
        public static void WriteJson(string f, Dictionary<string, object> o)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(f));
            var tmp = f + ".tmp";
            File.WriteAllText(tmp, Json.Serialize(o), new UTF8Encoding(false));
            if (File.Exists(f)) File.Delete(f);
            File.Move(tmp, f);
        }
        static int AsInt(object v, int d) { try { return v == null ? d : Convert.ToInt32(v); } catch { return d; } }
        static bool AsBool(object v, bool d) { return v is bool ? (bool)v : d; }
        static string AsStr(object v) { return v as string ?? ""; }

        public int Port { get { var p = AsInt(ReadJson(ServerFile).GetValueOrDefaultX("port"), DefaultPort); return p >= 1024 && p <= 65535 ? p : DefaultPort; } }
        public string Host { get { var h = AsStr(ReadJson(ServerFile).GetValueOrDefaultX("host")); return h == "0.0.0.0" ? "0.0.0.0" : "127.0.0.1"; } }
        public void SetServer(int? port, string host)
        {
            var o = ReadJson(ServerFile);
            if (port.HasValue) o["port"] = port.Value;
            if (host != null) o["host"] = host;
            WriteJson(ServerFile, o);
        }
        public bool Opt(string k, bool d) { return AsBool(ReadJson(LauncherFile).GetValueOrDefaultX(k), d); }
        public string OptS(string k) { return AsStr(ReadJson(LauncherFile).GetValueOrDefaultX(k)); }
        public void SetOpts(Dictionary<string, object> kv) { var o = ReadJson(LauncherFile); foreach (var p in kv) o[p.Key] = p.Value; WriteJson(LauncherFile, o); }
        public string Url { get { return "http://127.0.0.1:" + Port + "/"; } }

        // ---------------- Node.js 찾기
        public string FindNode()
        {
            var set = OptS("node");
            if (set != "" && File.Exists(set)) return set;
            foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
            {
                try { var f = Path.Combine(dir.Trim().Trim('"'), "node.exe"); if (dir.Trim() != "" && File.Exists(f)) return f; } catch { }
            }
            foreach (var f in new[] {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                Path.Combine(Environment.GetEnvironmentVariable("ProgramW6432") ?? "C:\\Program Files", "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe") })
                if (File.Exists(f)) return f;
            return null;
        }
        public static string NodeVersion(string node)
        {
            try
            {
                var p = Process.Start(new ProcessStartInfo(node, "-v") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true });
                var v = p.StandardOutput.ReadToEnd().Trim(); p.WaitForExit(3000); return v;
            }
            catch { return null; }
        }

        // ---------------- 상태
        static string HttpGet(string url, int ms)
        {
            var rq = (HttpWebRequest)WebRequest.Create(url);
            rq.Timeout = ms; rq.ReadWriteTimeout = ms; rq.Proxy = null;
            using (var rs = (HttpWebResponse)rq.GetResponse())
            using (var sr = new StreamReader(rs.GetResponseStream(), Encoding.UTF8)) return sr.ReadToEnd();
        }
        static Process Alive(int pid)
        {
            if (pid <= 0) return null;
            try { var p = Process.GetProcessById(pid); if (p.HasExited || !p.ProcessName.Equals("node", StringComparison.OrdinalIgnoreCase)) return null; return p; } catch { return null; }
        }
        public ServerStatus Status()
        {
            var st = new ServerStatus { Port = Port, Host = Host };
            var pidj = ReadJson(PidFile);
            int pid = AsInt(pidj.GetValueOrDefaultX("pid"), 0);
            var proc = Alive(pid);
            if (proc != null)
            {
                st.Pid = pid; st.Running = true;
                st.Port = AsInt(pidj.GetValueOrDefaultX("port"), st.Port);
                st.Host = AsStr(pidj.GetValueOrDefaultX("host")) == "" ? st.Host : AsStr(pidj.GetValueOrDefaultX("host"));
                try { st.Started = Convert.ToInt64(pidj.GetValueOrDefaultX("started")); } catch { }
                try { proc.Refresh(); st.MemMB = proc.WorkingSet64 / 1048576.0; } catch { }
            }
            try
            {
                var j = Json.DeserializeObject(HttpGet("http://127.0.0.1:" + st.Port + "/api/state", 1500)) as Dictionary<string, object>;
                if (j != null && AsStr(j.GetValueOrDefaultX("mode")) == "live")
                {
                    st.Responding = true;
                    if (!st.Running) { st.Running = true; st.Legacy = true; var lp = FindServerProcesses().FirstOrDefault(); if (lp != null) { st.Pid = lp.Id; try { st.MemMB = lp.WorkingSet64 / 1048576.0; st.Started = new DateTimeOffset(lp.StartTime).ToUnixTimeMilliseconds(); } catch { } } }
                    var ss = j.GetValueOrDefaultX("sessions") as object[];
                    if (ss != null)
                    {
                        st.Sessions = ss.Length;
                        foreach (var o in ss)
                        {
                            var s = o as Dictionary<string, object>; if (s == null) continue;
                            var stt = AsStr(s.GetValueOrDefaultX("status"));
                            if (stt == "working" || stt == "tool" || stt == "thinking" || stt == "delegating") st.Busy++;
                            if (stt == "waiting_input" || stt == "waiting_permission") st.Urgent++;
                        }
                    }
                }
            }
            catch { }
            return st;
        }

        /// 이 폴더의 server\index.mjs 를 돌리는 node 프로세스 (PID 파일이 없을 때 — 예전 방식으로 켜진 서버)
        public List<Process> FindServerProcesses()
        {
            var list = new List<Process>();
            var needle = Path.Combine(Root, "server", "index.mjs").ToLowerInvariant();
            try
            {
                var t = Type.GetTypeFromProgID("WbemScripting.SWbemLocator");
                var loc = Activator.CreateInstance(t);
                var svc = t.InvokeMember("ConnectServer", BindingFlags.InvokeMethod, null, loc, new object[] { ".", "root\\cimv2" });
                var res = svc.GetType().InvokeMember("ExecQuery", BindingFlags.InvokeMethod, null, svc, new object[] { "SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='node.exe'" });
                foreach (var item in (System.Collections.IEnumerable)res)
                {
                    var cmd = (item.GetType().InvokeMember("CommandLine", BindingFlags.GetProperty, null, item, null) as string ?? "").ToLowerInvariant();
                    if (!cmd.Contains(needle)) continue;
                    var id = Convert.ToInt32(item.GetType().InvokeMember("ProcessId", BindingFlags.GetProperty, null, item, null));
                    try { list.Add(Process.GetProcessById(id)); } catch { }
                }
            }
            catch { }
            return list;
        }

        // ---------------- 시작 · 중지
        public string Start(bool open, Action<string> say)
        {
            var st = Status();
            if (st.Running) { say("이미 실행 중이에요 → " + Url); if (open) OpenDashboard(); return null; }
            var node = FindNode();
            if (node == null) return "Node.js 를 찾지 못했어요. https://nodejs.org 에서 설치하거나 설정에서 node.exe 위치를 지정하세요.";
            var port = Port;
            if (!PortFree(port)) return "포트 " + port + " 을(를) 다른 프로그램이 쓰고 있어요. 설정에서 다른 포트를 고르세요.";
            // 셸 실행 + 숨김 창: 실행기의 표준입출력 핸들을 물려주지 않아, 명령줄에서 파이프로 불러도 바로 끝난다 (서버는 독립 실행)
            var psi = new ProcessStartInfo(node, "\"" + Path.Combine(Root, "server", "index.mjs") + "\"" + (open ? " --open" : ""))
            { WorkingDirectory = Root, UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden };
            Process.Start(psi);
            say("서버를 켜는 중… (포트 " + port + ")");
            for (int i = 0; i < 40; i++)
            {
                Thread.Sleep(250);
                if (Status().Responding) { say("켜졌어요 → " + Url); return null; }
            }
            return "서버가 응답하지 않아요. 로그(ai-office.log)를 확인하세요.";
        }

        public string EnsureKey()
        {
            try { var k = File.ReadAllText(KeyFile).Trim(); if (k.Length >= 32) return k; } catch { }
            var b = new byte[32]; using (var r = RandomNumberGenerator.Create()) r.GetBytes(b);
            var key = BitConverter.ToString(b).Replace("-", "").ToLowerInvariant();
            Directory.CreateDirectory(Data); File.WriteAllText(KeyFile, key);
            return key;
        }

        public string Stop(Action<string> say)
        {
            var st = Status();
            if (!st.Running) { say("이미 꺼져 있어요"); return null; }
            say("서버를 끄는 중…");
            // ① 정상 종료 요청 (이 PC 의 실행기만 아는 열쇠)
            try
            {
                var rq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + st.Port + "/api/server/shutdown");
                rq.Method = "POST"; rq.Timeout = 2000; rq.Proxy = null; rq.ContentType = "application/json";
                rq.Headers["X-AIO-Launcher"] = EnsureKey();
                var body = Encoding.UTF8.GetBytes("{}"); rq.ContentLength = body.Length;
                using (var s = rq.GetRequestStream()) s.Write(body, 0, body.Length);
                using (rq.GetResponse()) { }
            }
            catch { }
            for (int i = 0; i < 20; i++) { Thread.Sleep(200); if (!Status().Running) { say("꺼졌어요"); return null; } }
            // ② 그래도 살아 있으면 강제 종료
            var procs = new List<Process>();
            var p = Alive(st.Pid); if (p != null) procs.Add(p);
            procs.AddRange(FindServerProcesses().Where(x => procs.All(y => y.Id != x.Id)));
            foreach (var x in procs) { try { x.Kill(); x.WaitForExit(3000); } catch { } }
            try { File.Delete(PidFile); } catch { }
            Thread.Sleep(300);
            if (Status().Running) return "서버를 끄지 못했어요 (다른 사용자 권한으로 실행 중일 수 있어요)";
            say("꺼졌어요 (강제 종료)");
            return null;
        }

        public void OpenDashboard() { try { Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true }); } catch { } }

        // ---------------- 포트 검사
        public bool PortFree(int port)
        {
            try { var l = new TcpListener(IPAddress.Loopback, port); l.Start(); l.Stop(); return true; } catch { return false; }
        }
        static string Netsh(string args)
        {
            try
            {
                var p = Process.Start(new ProcessStartInfo("netsh", args) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, StandardOutputEncoding = Encoding.Default });
                var o = p.StandardOutput.ReadToEnd(); p.WaitForExit(4000); return o;
            }
            catch { return ""; }
        }
        /// 포트 판정: (괜찮은지, 설명)
        public Tuple<bool, string> CheckPort(int port, bool ours)
        {
            if (port < 1024 || port > 65535) return Tuple.Create(false, "1024 ~ 65535 사이로 골라 주세요.");
            var notes = new List<string>(); bool ok = true;
            var dyn = Regex.Matches(Netsh("int ipv4 show dynamicport tcp"), @"\d+").Cast<Match>().Select(m => int.Parse(m.Value)).ToList();
            if (dyn.Count >= 2 && port >= dyn[0] && port < dyn[0] + dyn[1]) { notes.Add("⚠ 이 PC 의 동적 포트 범위(" + dyn[0] + "~" + (dyn[0] + dyn[1] - 1) + ") 안이에요. 재부팅 때 윈도우가 예약해 막을 수 있어요."); ok = false; }
            foreach (Match m in Regex.Matches(Netsh("int ipv4 show excludedportrange protocol=tcp"), @"^\s*(\d+)\s+(\d+)", RegexOptions.Multiline))
            {
                int a = int.Parse(m.Groups[1].Value), b = int.Parse(m.Groups[2].Value);
                if (port >= a && port <= b) { notes.Add("⛔ 윈도우가 예약한 범위(" + a + "~" + b + ")라 열 수 없어요."); ok = false; }
            }
            if (!ours && !PortFree(port)) { notes.Add("⛔ 지금 다른 프로그램이 쓰고 있어요."); ok = false; }
            if (ok) notes.Add("✅ 쓸 수 있는 포트예요.");
            return Tuple.Create(ok, string.Join("\n", notes));
        }

        // ---------------- 로그
        public string[] TailLog(int lines)
        {
            try
            {
                using (var fs = new FileStream(LogFile, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                {
                    long len = fs.Length, from = Math.Max(0, len - 256 * 1024);
                    fs.Seek(from, SeekOrigin.Begin);
                    var txt = new StreamReader(fs, Encoding.UTF8).ReadToEnd();
                    var arr = txt.Replace("\r", "").Split('\n').Where(x => x.Length > 0).ToArray();
                    return arr.Skip(Math.Max(0, arr.Length - lines)).ToArray();
                }
            }
            catch { return new string[0]; }
        }

        // ---------------- 관리자 계정 (server/set-admin.mjs 에 표준입력으로 전달 — 비밀번호는 파일 · 인자 · 로그에 남지 않음)
        public string AdminId { get { return AsStr(ReadJson(AuthFile).GetValueOrDefaultX("user")); } }
        public string SetAdmin(string id, string pw)
        {
            var node = FindNode(); if (node == null) return "Node.js 를 찾지 못했어요";
            var psi = new ProcessStartInfo(node, "\"" + Path.Combine(Root, "server", "set-admin.mjs") + "\"")
            { WorkingDirectory = Root, UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8 };
            var p = Process.Start(psi);
            var w = new StreamWriter(p.StandardInput.BaseStream, new UTF8Encoding(false));
            w.Write(id + "\n" + pw + "\n"); w.Flush(); w.Close();
            var o = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
            p.WaitForExit(10000);
            return p.ExitCode == 0 ? null : (o.Trim() == "" ? "실패했어요" : o.Trim());
        }

        // ---------------- Windows 로그인 때 자동 시작 (시작프로그램 바로가기)
        public string StartupLnk { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), "AI OFFICE.lnk"); } }
        public string ExePath { get { return Assembly.GetExecutingAssembly().Location; } }
        /// (켜져 있는지, 이 폴더를 가리키는지, 설명)
        public Tuple<bool, bool, string> LogonState()
        {
            if (!File.Exists(StartupLnk)) return Tuple.Create(false, false, "꺼져 있어요");
            try
            {
                var sh = Type.GetTypeFromProgID("WScript.Shell"); var o = Activator.CreateInstance(sh);
                var lnk = sh.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, o, new object[] { StartupLnk });
                var target = (string)lnk.GetType().InvokeMember("TargetPath", BindingFlags.GetProperty, null, lnk, null);
                var args = (string)lnk.GetType().InvokeMember("Arguments", BindingFlags.GetProperty, null, lnk, null);
                var all = (target + " " + args).ToLowerInvariant();
                bool ours = all.Contains(Root.ToLowerInvariant());
                return Tuple.Create(true, ours, ours ? "켜져 있어요 (이 폴더의 서버)" : "⚠ 켜져 있지만 다른 폴더를 가리켜요: " + (args.Trim() != "" ? args : target));
            }
            catch (Exception e) { return Tuple.Create(true, false, "바로가기를 읽지 못했어요: " + e.Message); }
        }
        public void SetLogon(bool on)
        {
            if (!on) { if (File.Exists(StartupLnk)) File.Delete(StartupLnk); return; }
            var sh = Type.GetTypeFromProgID("WScript.Shell"); var o = Activator.CreateInstance(sh);
            var lnk = sh.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, o, new object[] { StartupLnk });
            var t = lnk.GetType();
            t.InvokeMember("TargetPath", BindingFlags.SetProperty, null, lnk, new object[] { ExePath });
            t.InvokeMember("Arguments", BindingFlags.SetProperty, null, lnk, new object[] { "start --quiet" });
            t.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, lnk, new object[] { Root });
            t.InvokeMember("Description", BindingFlags.SetProperty, null, lnk, new object[] { "AI OFFICE 서버 (" + Url + ")" });
            t.InvokeMember("IconLocation", BindingFlags.SetProperty, null, lnk, new object[] { ExePath + ",0" });
            t.InvokeMember("Save", BindingFlags.InvokeMethod, null, lnk, null);
        }

        public static string Ago(long startedMs)
        {
            if (startedMs <= 0) return "—";
            var d = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - startedMs; if (d < 0) d = 0;
            var m = d / 60000; if (m < 1) return (d / 1000) + "초";
            if (m < 60) return m + "분"; var h = m / 60; if (h < 24) return h + "시간 " + (m % 60) + "분";
            return (h / 24) + "일 " + (h % 24) + "시간";
        }
    }

    static class DictX { public static object GetValueOrDefaultX(this Dictionary<string, object> d, string k) { object v; return d != null && d.TryGetValue(k, out v) ? v : null; } }

    // ------------------------------------------------------------------ 진입점 · 명령줄
    public static class Program
    {
        [DllImport("kernel32.dll")] static extern bool AttachConsole(int pid);
        [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int n);
        [DllImport("kernel32.dll")] static extern uint GetFileType(IntPtr h);
        [DllImport("kernel32.dll")] static extern uint GetConsoleOutputCP();
        static bool consoleAttached;

        static void SetupConsole()
        {
            var h = GetStdHandle(-11);
            bool redirected = h != IntPtr.Zero && h != new IntPtr(-1) && GetFileType(h) != 0;
            if (!redirected) consoleAttached = AttachConsole(-1);
            Encoding enc = new UTF8Encoding(false);
            if (consoleAttached) { try { enc = Encoding.GetEncoding((int)GetConsoleOutputCP()); } catch { } }
            try { var o = new StreamWriter(Console.OpenStandardOutput(), enc) { AutoFlush = true }; Console.SetOut(o); Console.SetError(o); } catch { }
            if (consoleAttached) Console.WriteLine();
        }

        const string Help =
@"AI OFFICE 서버 실행기

  AI-OFFICE.exe                       창(GUI)으로 열기
  AI-OFFICE.exe --tray                알림 영역에 숨긴 채로 열기
  AI-OFFICE.exe start [--port N] [--host 127.0.0.1|0.0.0.0] [--open] [--quiet]
                                      서버를 백그라운드로 켜기 (설정에 저장)
  AI-OFFICE.exe stop                  서버 끄기
  AI-OFFICE.exe restart [--open]      다시 켜기
  AI-OFFICE.exe status [--json]       상태 (실행 여부 · 포트 · PID · 세션 수)
  AI-OFFICE.exe run                   이 터미널에서 서버 실행 (Ctrl+C 로 종료)
  AI-OFFICE.exe config [--port N] [--host H] [--node 경로]   설정 보기 · 바꾸기
  AI-OFFICE.exe check-port N          포트를 쓸 수 있는지 검사
  AI-OFFICE.exe open                  대시보드를 브라우저로 열기
  AI-OFFICE.exe logs [-n 50]          최근 로그
  AI-OFFICE.exe set-admin             관리자 계정 설정 (이 터미널에서 입력)
  AI-OFFICE.exe help                  이 도움말

종료 코드: 0 성공 · 1 실패 · 2 사용법 오류.  status 는 꺼져 있으면 3.";

        public static string HelpText { get { return Help; } }

        static string Arg(string[] a, string name) { var i = Array.IndexOf(a, name); return i >= 0 && i + 1 < a.Length ? a[i + 1] : null; }

        [STAThread]
        public static int Main(string[] args)
        {
            var root = Core.FindRoot(Arg(args, "--root"));
            var cmd = args.Length > 0 && !args[0].StartsWith("--") ? args[0].ToLowerInvariant() : "";
            if (cmd == "")
            {
                if (root == null) { MessageBox.Show("이 실행 파일을 AI OFFICE 폴더(server\\index.mjs 가 있는 곳)에 두고 실행하세요.", "AI OFFICE", MessageBoxButton.OK, MessageBoxImage.Warning); return 1; }
                var snap = Arg(args, "--snapshot");
                if (snap != null) return Gui.Snapshot(new Core(root), snap, Arg(args, "--page") ?? "NavHome");
                return Gui.Run(new Core(root), args.Contains("--tray"));
            }
            SetupConsole();
            try { return Cli(root, cmd, args); }
            catch (Exception e) { Console.WriteLine("오류: " + e.Message); return 1; }
            finally { if (consoleAttached) { Console.Out.Flush(); SendEnter(); } }
        }

        [DllImport("user32.dll")] static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
        [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        /// 붙은 콘솔(cmd)이 프롬프트를 다시 그리게 Enter 한 번 (그 창이 앞에 있을 때만)
        static void SendEnter() { try { if (GetConsoleWindow() == GetForegroundWindow()) { keybd_event(0x0D, 0, 0, UIntPtr.Zero); keybd_event(0x0D, 0, 2, UIntPtr.Zero); } } catch { } }

        static int Cli(string root, string cmd, string[] a)
        {
            if (cmd == "help" || cmd == "-h" || cmd == "/?") { Console.WriteLine(Help); return 0; }
            if (root == null) { Console.WriteLine("AI OFFICE 폴더를 찾지 못했어요. 실행 파일을 server\\index.mjs 가 있는 폴더에 두거나 --root 경로를 주세요."); return 1; }
            var c = new Core(root);
            bool quiet = a.Contains("--quiet");
            Action<string> say = s => { if (!quiet) Console.WriteLine(s); };
            switch (cmd)
            {
                case "start":
                case "restart":
                    {
                        int? port = null; var ps = Arg(a, "--port"); int pv;
                        if (ps != null) { if (!int.TryParse(ps, out pv) || pv < 1024 || pv > 65535) { Console.WriteLine("포트는 1024~65535"); return 2; } port = pv; }
                        var host = Arg(a, "--host"); if (host != null && host != "127.0.0.1" && host != "0.0.0.0") { Console.WriteLine("--host 는 127.0.0.1 또는 0.0.0.0"); return 2; }
                        if (cmd == "restart" || ((port.HasValue && port.Value != c.Port) || (host != null && host != c.Host)))
                        { if (c.Status().Running) { var e0 = c.Stop(say); if (e0 != null) { Console.WriteLine(e0); return 1; } } }
                        if (port.HasValue || host != null) c.SetServer(port, host);
                        var err = c.Start(a.Contains("--open") || c.Opt("openOnStart", false) && !quiet, say);
                        if (err != null) { Console.WriteLine(err); return 1; }
                        return 0;
                    }
                case "stop": { var err = c.Stop(say); if (err != null) { Console.WriteLine(err); return 1; } return 0; }
                case "status":
                    {
                        var st = c.Status();
                        if (a.Contains("--json"))
                            Console.WriteLine(new JavaScriptSerializer().Serialize(new Dictionary<string, object> { { "running", st.Running }, { "responding", st.Responding }, { "port", st.Port }, { "host", st.Host }, { "pid", st.Pid }, { "started", st.Started }, { "sessions", st.Sessions }, { "busy", st.Busy }, { "urgent", st.Urgent }, { "memMB", Math.Round(st.MemMB, 1) }, { "url", "http://127.0.0.1:" + st.Port + "/" } }));
                        else if (!st.Running) Console.WriteLine("● 꺼져 있어요   (포트 설정: " + c.Port + ")");
                        else Console.WriteLine("● 실행 중  http://127.0.0.1:" + st.Port + "/\n  PID " + st.Pid + " · 가동 " + Core.Ago(st.Started) + " · 메모리 " + Math.Round(st.MemMB) + "MB\n  세션 " + st.Sessions + " · 일하는 중 " + st.Busy + " · 결정 필요 " + st.Urgent + (st.Host == "0.0.0.0" ? "\n  ⚠ 같은 네트워크에도 열려 있어요 (0.0.0.0)" : ""));
                        return st.Running ? 0 : 3;
                    }
                case "run":
                    {
                        if (c.Status().Running) { Console.WriteLine("이미 실행 중이에요 → " + c.Url + "  (먼저 stop)"); return 1; }
                        var node = c.FindNode(); if (node == null) { Console.WriteLine("Node.js 를 찾지 못했어요"); return 1; }
                        Console.WriteLine("서버를 이 터미널에서 실행해요 → " + c.Url + "  (Ctrl+C 로 종료)");
                        var p = Process.Start(new ProcessStartInfo(node, "\"" + Path.Combine(root, "server", "index.mjs") + "\"") { WorkingDirectory = root, UseShellExecute = false });
                        p.WaitForExit(); return p.ExitCode;
                    }
                case "config":
                    {
                        var ps = Arg(a, "--port"); var host = Arg(a, "--host"); var node = Arg(a, "--node"); int pv;
                        if (ps != null) { if (!int.TryParse(ps, out pv) || pv < 1024 || pv > 65535) { Console.WriteLine("포트는 1024~65535"); return 2; } c.SetServer(pv, null); }
                        if (host != null) { if (host != "127.0.0.1" && host != "0.0.0.0") { Console.WriteLine("--host 는 127.0.0.1 또는 0.0.0.0"); return 2; } c.SetServer(null, host); }
                        if (node != null) { if (!File.Exists(node)) { Console.WriteLine("node.exe 가 없어요: " + node); return 2; } c.SetOpts(new Dictionary<string, object> { { "node", node } }); }
                        var nd = c.FindNode();
                        Console.WriteLine("폴더   " + root + "\n포트   " + c.Port + "\n주소   " + c.Host + (c.Host == "0.0.0.0" ? " (같은 네트워크에도 열림)" : " (이 PC 만)") + "\nNode   " + (nd ?? "(못 찾음)") + "\n자동 시작 " + c.LogonState().Item3);
                        if (ps != null || host != null) Console.WriteLine("→ 바꾼 설정은 서버를 다시 켜면 적용돼요 (restart)");
                        return 0;
                    }
                case "check-port":
                    {
                        int pv; if (a.Length < 2 || !int.TryParse(a[1], out pv)) { Console.WriteLine("사용법: check-port 17777"); return 2; }
                        var r = c.CheckPort(pv, c.Status().Running && c.Status().Port == pv); Console.WriteLine(r.Item2); return r.Item1 ? 0 : 1;
                    }
                case "open": c.OpenDashboard(); return 0;
                case "logs": { int n; if (!int.TryParse(Arg(a, "-n") ?? "50", out n)) n = 50; foreach (var l in c.TailLog(n)) Console.WriteLine(l); return 0; }
                case "set-admin":
                    {
                        var node = c.FindNode(); if (node == null) { Console.WriteLine("Node.js 를 찾지 못했어요"); return 1; }
                        var p = Process.Start(new ProcessStartInfo(node, "\"" + Path.Combine(root, "server", "set-admin.mjs") + "\"") { WorkingDirectory = root, UseShellExecute = false });
                        p.WaitForExit(); return p.ExitCode;
                    }
                default: Console.WriteLine("모르는 명령: " + cmd + "\n\n" + Help); return 2;
            }
        }
    }

    // ------------------------------------------------------------------ 창(GUI)
    public sealed class Gui
    {
        readonly Core core; Window w; DispatcherTimer timer;
        WF.NotifyIcon tray; bool quitting, wantRunning, userStopped, busy;
        readonly Queue<DateTime> restarts = new Queue<DateTime>();
        ServerStatus last;
#pragma warning disable 414

        T F<T>(string n) where T : class { return w.FindName(n) as T; }
        Gui(Core c) { core = c; }

        public static int Run(Core core, bool startHidden)
        {
            bool created;
            var mutex = new Mutex(true, "AIOffice.Launcher." + core.Root.ToLowerInvariant().GetHashCode().ToString("x"), out created);
            var showEvt = new EventWaitHandle(false, EventResetMode.AutoReset, "AIOffice.Launcher.Show." + core.Root.ToLowerInvariant().GetHashCode().ToString("x"));
            if (!created) { showEvt.Set(); return 0; }   // 이미 열려 있으면 그 창을 앞으로
            var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
            var g = new Gui(core);
            g.Build();
            new Thread(() => { while (true) { showEvt.WaitOne(); g.w.Dispatcher.BeginInvoke(new Action(g.ShowWin)); } }) { IsBackground = true }.Start();
            if (!startHidden) g.w.Show();
            if (core.Opt("autoStart", false)) g.DoStart();
            app.Run();
            GC.KeepAlive(mutex);
            return 0;
        }

        /// 확인 · 문서용: 창을 화면 밖에 띄워 그린 뒤 PNG 로 저장 (--snapshot 파일 [--page NavSet])
        public static int Snapshot(Core core, string file, string page)
        {
            var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
            var g = new Gui(core); g.snapshot = true; g.Build();
            g.w.WindowStartupLocation = WindowStartupLocation.Manual; g.w.Left = -4000; g.w.Top = 0; g.w.ShowInTaskbar = false;
            g.w.Show();
            var nav = g.F<RadioButton>(page); if (nav != null) nav.IsChecked = true;
            var t = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
            t.Tick += (o, e) =>
            {
                t.Stop();
                var el = (FrameworkElement)g.w.Content;
                var bmp = new System.Windows.Media.Imaging.RenderTargetBitmap((int)Math.Ceiling(el.ActualWidth + 24), (int)Math.Ceiling(el.ActualHeight + 24), 96, 96, PixelFormats.Pbgra32);
                bmp.Render(g.w);
                var enc = new System.Windows.Media.Imaging.PngBitmapEncoder(); enc.Frames.Add(System.Windows.Media.Imaging.BitmapFrame.Create(bmp));
                using (var fs = File.Create(file)) enc.Save(fs);
                g.quitting = true; try { g.tray.Visible = false; g.tray.Dispose(); } catch { }
                app.Shutdown();
            };
            t.Start();
            app.Run();
            return 0;
        }
        bool snapshot;

        void Build()
        {
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("ui.xaml")) w = (Window)XamlReader.Load(s);
            try { w.Icon = System.Windows.Interop.Imaging.CreateBitmapSourceFromHIcon(System.Drawing.Icon.ExtractAssociatedIcon(core.ExePath).Handle, Int32Rect.Empty, System.Windows.Media.Imaging.BitmapSizeOptions.FromEmptyOptions()); } catch { }
            MouseButtonEventHandler drag = (o, e) => { if (e.ClickCount == 2) w.WindowState = w.WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized; else try { w.DragMove(); } catch { } };
            F<Grid>("TitleBar").MouseLeftButtonDown += drag;
            F<StackPanel>("DragArea").MouseLeftButtonDown += drag;
            F<Button>("BtnMin").Click += (o, e) => w.WindowState = WindowState.Minimized;
            F<Button>("BtnClose").Click += (o, e) => CloseWin();
            w.Closing += (o, e) => { if (!quitting) { e.Cancel = true; CloseWin(); } };

            // 메뉴
            var pages = new Dictionary<string, Tuple<string, string>> {
                { "NavHome", Tuple.Create("PageHome", "상태") }, { "NavSet", Tuple.Create("PageSet", "서버 설정") },
                { "NavAdmin", Tuple.Create("PageAdmin", "관리자 계정") }, { "NavLog", Tuple.Create("PageLog", "로그") }, { "NavCli", Tuple.Create("PageCli", "명령줄 (CLI)") } };
            foreach (var kv in pages)
            {
                var nav = F<RadioButton>(kv.Key); var page = kv.Value;
                nav.Checked += (o, e) =>
                {
                    foreach (var p in pages.Values) ((UIElement)w.FindName(p.Item1)).Visibility = Visibility.Collapsed;
                    ((UIElement)w.FindName(page.Item1)).Visibility = Visibility.Visible;
                    F<TextBlock>("PageTitle").Text = page.Item2;
                    if (page.Item1 == "PageSet") LoadSettings();
                    if (page.Item1 == "PageAdmin") LoadAdmin();
                    if (page.Item1 == "PageLog") RefreshLog(true);
                };
            }

            // 상태
            F<Button>("BtnStart").Click += (o, e) => DoStart();
            F<Button>("BtnStop").Click += (o, e) => DoStop();
            F<Button>("BtnRestart").Click += (o, e) => RunBusy("다시 켜는 중…", () => { var e1 = core.Stop(s => { }); if (e1 != null) return e1; return core.Start(false, s => { }); }, "다시 켰어요");
            F<Button>("BtnOpen").Click += (o, e) => core.OpenDashboard();
            F<TextBlock>("HeroUrl").MouseLeftButtonUp += (o, e) => core.OpenDashboard();
            F<Button>("BtnMoreLog").Click += (o, e) => F<RadioButton>("NavLog").IsChecked = true;

            // 설정
            F<Button>("BtnCheckPort").Click += (o, e) => CheckPortUi();
            F<Button>("BtnPortDefault").Click += (o, e) => { F<TextBox>("SPort").Text = Core.DefaultPort.ToString(); CheckPortUi(); };
            F<Button>("BtnNodeFind").Click += (o, e) =>
            {
                var d = new Microsoft.Win32.OpenFileDialog { Filter = "node.exe|node.exe", Title = "node.exe 위치" };
                if (d.ShowDialog(w) == true) { F<TextBox>("SNode").Text = d.FileName; NodeHintUpdate(); }
            };
            F<Button>("BtnRootOpen").Click += (o, e) => { try { Process.Start("explorer.exe", "\"" + core.Root + "\""); } catch { } };
            F<Button>("BtnSave").Click += (o, e) => SaveSettings();
            F<RadioButton>("SHostLan").Checked += (o, e) => { };

            // 관리자
            F<Button>("BtnAdminSave").Click += (o, e) => SaveAdmin();

            // 로그
            F<Button>("BtnLogRefresh").Click += (o, e) => RefreshLog(true);
            F<Button>("BtnLogOpen").Click += (o, e) => { try { Process.Start(new ProcessStartInfo(core.LogFile) { UseShellExecute = true }); } catch { Toast("로그 파일이 아직 없어요"); } };

            // CLI
            F<TextBox>("CliText").Text = Program.HelpText + "\n\n예)\n  \"" + core.ExePath + "\" start --open\n  \"" + core.ExePath + "\" status --json\n  \"" + core.ExePath + "\" config --port 17777";
            F<Button>("BtnCliCopy").Click += (o, e) => { try { Clipboard.SetText(F<TextBox>("CliText").Text); Toast("복사했어요"); } catch { } };

            // 트레이
            tray = new WF.NotifyIcon { Text = "AI OFFICE 서버", Visible = !snapshot };
            try { tray.Icon = System.Drawing.Icon.ExtractAssociatedIcon(core.ExePath); } catch { tray.Icon = System.Drawing.SystemIcons.Application; }
            var menu = new WF.ContextMenuStrip();
            menu.Items.Add("실행기 열기", null, (o, e) => ShowWin());
            menu.Items.Add("대시보드 열기", null, (o, e) => core.OpenDashboard());
            menu.Items.Add(new WF.ToolStripSeparator());
            menu.Items.Add("서버 시작", null, (o, e) => w.Dispatcher.BeginInvoke(new Action(DoStart)));
            menu.Items.Add("서버 중지", null, (o, e) => w.Dispatcher.BeginInvoke(new Action(DoStop)));
            menu.Items.Add(new WF.ToolStripSeparator());
            menu.Items.Add("실행기 끝내기 (서버는 계속)", null, (o, e) => Quit());
            tray.ContextMenuStrip = menu;
            tray.DoubleClick += (o, e) => ShowWin();

            F<TextBlock>("VerText").Text = "서버 실행기 · v6";
            timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
            timer.Tick += (o, e) => Refresh();
            timer.Start();
            Refresh();
        }

        void ShowWin() { w.Show(); if (w.WindowState == WindowState.Minimized) w.WindowState = WindowState.Normal; w.Activate(); w.Topmost = true; w.Topmost = false; }
        void CloseWin()
        {
            if (core.Opt("tray", true)) { w.Hide(); if (!core.Opt("trayTold", false)) { tray.ShowBalloonTip(3000, "AI OFFICE", "알림 영역에서 계속 실행 중이에요. 서버도 그대로 켜져 있어요.", WF.ToolTipIcon.Info); core.SetOpts(new Dictionary<string, object> { { "trayTold", true } }); } }
            else Quit();
        }
        void Quit() { quitting = true; try { tray.Visible = false; tray.Dispose(); } catch { } Application.Current.Shutdown(); }

        void Toast(string t)
        {
            F<TextBlock>("ToastText").Text = t; var b = F<Border>("Toast"); b.Visibility = Visibility.Visible;
            var tm = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2.6) }; tm.Tick += (o, e) => { b.Visibility = Visibility.Collapsed; tm.Stop(); }; tm.Start();
        }

        void RunBusy(string msg, Func<string> work, string done)
        {
            if (busy) return; busy = true; Toast(msg); SetButtons();
            Task.Run(work).ContinueWith(t => w.Dispatcher.Invoke(() =>
            {
                busy = false; var err = t.Exception != null ? t.Exception.GetBaseException().Message : t.Result;
                if (err != null) MessageBox.Show(w, err, "AI OFFICE", MessageBoxButton.OK, MessageBoxImage.Warning); else Toast(done);
                Refresh();
            }));
        }
        void DoStart() { userStopped = false; wantRunning = true; RunBusy("서버를 켜는 중…", () => core.Start(core.Opt("openOnStart", false), s => { }), "서버가 켜졌어요"); }
        void DoStop() { userStopped = true; wantRunning = false; RunBusy("서버를 끄는 중…", () => core.Stop(s => { }), "서버를 껐어요"); }

        void SetButtons()
        {
            bool run = last != null && last.Running;
            F<Button>("BtnStart").Visibility = run ? Visibility.Collapsed : Visibility.Visible;
            F<Button>("BtnStop").Visibility = run ? Visibility.Visible : Visibility.Collapsed;
            F<Button>("BtnStart").IsEnabled = F<Button>("BtnStop").IsEnabled = F<Button>("BtnRestart").IsEnabled = !busy;
            F<Button>("BtnOpen").IsEnabled = run;
        }

        static readonly Brush Green = new SolidColorBrush(Color.FromRgb(0x2F, 0xB2, 0x7F)), Grey = new SolidColorBrush(Color.FromRgb(0x8A, 0x7F, 0x72)), Red = new SolidColorBrush(Color.FromRgb(0xE5, 0x53, 0x4B)), Amber = new SolidColorBrush(Color.FromRgb(0xF0, 0xA0, 0x3C));
        int refreshing;
        void Refresh()
        {
            if (Interlocked.Exchange(ref refreshing, 1) == 1) return;
            Task.Run(() => core.Status()).ContinueWith(t => w.Dispatcher.Invoke(() =>
            {
                refreshing = 0; if (t.Exception != null) return;
                var st = t.Result; bool wasRunning = last != null && last.Running; last = st;
                if (st.Running) wantRunning = true;
                // 꺼지면 다시 켜기 (사용자가 끈 게 아닐 때, 10분에 3번까지)
                if (wasRunning && !st.Running && !userStopped && !busy && core.Opt("watch", true))
                {
                    while (restarts.Count > 0 && (DateTime.Now - restarts.Peek()).TotalMinutes > 10) restarts.Dequeue();
                    if (restarts.Count < 3) { restarts.Enqueue(DateTime.Now); RunBusy("서버가 꺼져서 다시 켜는 중…", () => core.Start(false, s => { }), "서버를 다시 켰어요"); }
                }
                var dot = st.Running ? (st.Urgent > 0 ? Amber : Green) : busy ? Amber : Grey;
                string stateTxt = busy ? "처리 중…" : st.Running ? (st.Responding ? "실행 중" : "켜지는 중") : "꺼져 있어요";
                F<Ellipse>("StateDot").Fill = dot; F<Ellipse>("SideDot").Fill = dot;
                F<TextBlock>("StateText").Text = stateTxt; F<TextBlock>("SideState").Text = stateTxt;
                F<Border>("StatePill").Background = new SolidColorBrush(st.Running ? Color.FromRgb(0xDF, 0xF3, 0xE8) : Color.FromRgb(0xEE, 0xE6, 0xDA));
                var url = "http://127.0.0.1:" + st.Port + "/";
                F<TextBlock>("HeroUrl").Text = st.Running ? url : "";
                F<TextBlock>("SideUrl").Text = url;
                F<TextBlock>("HeroSub").Text = st.Running
                    ? (st.Host == "0.0.0.0" ? "⚠ 같은 네트워크에도 열려 있어요 (0.0.0.0) · " : "이 PC 에서만 열려 있어요 · ") + "PID " + st.Pid + (st.Legacy ? " · (예전 방식으로 켜진 서버)" : "")
                    : "서버를 켜면 이 PC 의 AI 세션(Claude Code · Codex · Gemini …)을 모아 사무실로 보여 줘요.";
                F<TextBlock>("TPort").Text = st.Port.ToString();
                F<TextBlock>("TUp").Text = st.Running ? Core.Ago(st.Started) : "—";
                F<TextBlock>("TSess").Text = st.Responding ? st.Sessions.ToString() : "—";
                F<TextBlock>("TBusy").Text = st.Responding ? st.Busy + " · " + st.Urgent : "—";
                F<TextBlock>("TMem").Text = st.Running ? Math.Round(st.MemMB) + "MB" : "—";
                tray.Text = ("AI OFFICE · " + stateTxt + (st.Running ? " · " + st.Sessions + "세션" : "")).Substring(0, Math.Min(63, ("AI OFFICE · " + stateTxt + (st.Running ? " · " + st.Sessions + "세션" : "")).Length));
                SetButtons();
                var lines = core.TailLog(12); F<TextBox>("HomeLog").Text = string.Join("\n", lines); F<TextBox>("HomeLog").ScrollToEnd();
                if (F<UIElement>("PageLog").Visibility == Visibility.Visible && F<CheckBox>("LogFollow").IsChecked == true) RefreshLog(false);
            }));
        }

        void RefreshLog(bool force)
        {
            var box = F<TextBox>("LogBox"); var txt = string.Join("\n", core.TailLog(600));
            if (force || box.Text != txt) { box.Text = txt; if (force || F<CheckBox>("LogFollow").IsChecked == true) box.ScrollToEnd(); }
        }

        // ---------------- 설정 화면
        void LoadSettings()
        {
            F<TextBox>("SPort").Text = core.Port.ToString();
            (core.Host == "0.0.0.0" ? F<RadioButton>("SHostLan") : F<RadioButton>("SHostLocal")).IsChecked = true;
            F<CheckBox>("SOpen").IsChecked = core.Opt("openOnStart", false);
            F<CheckBox>("SAutoStart").IsChecked = core.Opt("autoStart", false);
            F<CheckBox>("SWatch").IsChecked = core.Opt("watch", true);
            F<CheckBox>("STray").IsChecked = core.Opt("tray", true);
            var lg = core.LogonState(); F<CheckBox>("SLogon").IsChecked = lg.Item1 && lg.Item2; F<TextBlock>("LogonHint").Text = lg.Item3 + (lg.Item1 && !lg.Item2 ? "\n체크하고 저장하면 이 폴더의 서버(이 실행기)로 바꿔요." : "");
            F<TextBox>("SNode").Text = core.OptS("node") != "" ? core.OptS("node") : (core.FindNode() ?? "");
            F<TextBox>("SRoot").Text = core.Root;
            F<TextBlock>("PortHint").Text = "기본 17777. 이 PC 의 동적 포트 범위 밖 번호를 고르세요. 「사용 가능한지 확인」으로 검사할 수 있어요.";
            F<TextBlock>("SaveHint").Text = "";
            NodeHintUpdate();
        }
        void NodeHintUpdate()
        {
            var p = F<TextBox>("SNode").Text.Trim();
            var v = p != "" && File.Exists(p) ? Core.NodeVersion(p) : null;
            var mj = v != null ? Regex.Match(v, @"v(\d+)") : null; int major = mj != null && mj.Success ? int.Parse(mj.Groups[1].Value) : 0;
            F<TextBlock>("NodeHint").Text = v != null ? "✅ Node.js " + v + (major > 0 && major < 18 ? " — 18 이상이 필요해요" : "") : "⚠ node.exe 를 찾지 못했어요. https://nodejs.org 에서 LTS 를 설치하세요.";
        }
        void CheckPortUi()
        {
            int port; if (!int.TryParse(F<TextBox>("SPort").Text.Trim(), out port)) { F<TextBlock>("PortHint").Text = "숫자를 넣어 주세요"; return; }
            var ours = last != null && last.Running && last.Port == port;
            F<TextBlock>("PortHint").Text = "검사 중…";
            Task.Run(() => core.CheckPort(port, ours)).ContinueWith(t => w.Dispatcher.Invoke(() => F<TextBlock>("PortHint").Text = (ours ? "(지금 AI OFFICE 가 쓰는 포트)\n" : "") + t.Result.Item2));
        }
        void SaveSettings()
        {
            int port; if (!int.TryParse(F<TextBox>("SPort").Text.Trim(), out port) || port < 1024 || port > 65535) { MessageBox.Show(w, "포트는 1024 ~ 65535 사이 숫자로 넣어 주세요.", "AI OFFICE"); return; }
            var host = F<RadioButton>("SHostLan").IsChecked == true ? "0.0.0.0" : "127.0.0.1";
            var ours = last != null && last.Running && last.Port == port;
            var chk = core.CheckPort(port, ours);
            if (!chk.Item1 && MessageBox.Show(w, chk.Item2 + "\n\n그래도 이 포트로 저장할까요?", "포트 확인", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes) return;
            if (host == "0.0.0.0" && core.Host != "0.0.0.0" && MessageBox.Show(w, "같은 네트워크(와이파이 · 사내망)의 다른 기기도 이 PC 의 AI OFFICE 에 접속할 수 있게 돼요.\n로그인 없이는 세션 내용이 보이지 않지만, 정말 여시겠어요?", "같은 네트워크에 열기", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes) return;
            var node = F<TextBox>("SNode").Text.Trim();
            bool changed = port != core.Port || host != core.Host;
            core.SetServer(port, host);
            core.SetOpts(new Dictionary<string, object> {
                { "openOnStart", F<CheckBox>("SOpen").IsChecked == true }, { "autoStart", F<CheckBox>("SAutoStart").IsChecked == true },
                { "watch", F<CheckBox>("SWatch").IsChecked == true }, { "tray", F<CheckBox>("STray").IsChecked == true },
                { "node", node != "" && File.Exists(node) ? node : "" } });
            try
            {
                var want = F<CheckBox>("SLogon").IsChecked == true; var lg = core.LogonState();
                if (want != (lg.Item1 && lg.Item2)) core.SetLogon(want);
            }
            catch (Exception e) { MessageBox.Show(w, "자동 시작 설정 실패: " + e.Message, "AI OFFICE"); }
            LoadSettings();
            F<TextBlock>("SaveHint").Text = "저장했어요" + (changed ? " · 서버를 다시 켜야 적용돼요" : "");
            if (changed && last != null && last.Running && MessageBox.Show(w, "포트 · 주소를 바꿨어요. 지금 서버를 다시 켤까요?\n(새 주소: http://127.0.0.1:" + port + "/)", "다시 켜기", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
                RunBusy("다시 켜는 중…", () => { var e1 = core.Stop(s => { }); if (e1 != null) return e1; return core.Start(core.Opt("openOnStart", false), s => { }); }, "새 설정으로 다시 켰어요");
            else Toast("저장했어요");
        }

        // ---------------- 관리자 화면
        void LoadAdmin()
        {
            var id = core.AdminId;
            F<TextBlock>("AdminState").Text = id != "" ? "✅ 관리자 계정이 설정돼 있어요 — 아이디: " + id + "\n바꾸려면 아래에 새로 넣고 저장하세요." : "⚠ 아직 관리자 계정이 없어요. 만들어야 대시보드에 로그인할 수 있어요.";
            F<TextBox>("AId").Text = id; F<PasswordBox>("APw").Password = ""; F<PasswordBox>("APw2").Password = ""; F<TextBlock>("AdminMsg").Text = "";
        }
        void SaveAdmin()
        {
            var id = F<TextBox>("AId").Text.Trim(); var pw = F<PasswordBox>("APw").Password; var pw2 = F<PasswordBox>("APw2").Password;
            if (!Regex.IsMatch(id, @"^\S{3,64}$")) { F<TextBlock>("AdminMsg").Text = "아이디는 공백 없이 3자 이상"; return; }
            if (pw.Length < 12) { F<TextBlock>("AdminMsg").Text = "비밀번호는 12자 이상"; return; }
            if (pw != pw2) { F<TextBlock>("AdminMsg").Text = "비밀번호 확인이 달라요"; return; }
            if (core.AdminId != "" && MessageBox.Show(w, "관리자 계정을 바꾸면 지금 로그인된 화면이 모두 로그아웃돼요. 계속할까요?", "관리자 계정", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes) return;
            F<TextBlock>("AdminMsg").Text = "저장 중…";
            Task.Run(() => core.SetAdmin(id, pw)).ContinueWith(t => w.Dispatcher.Invoke(() =>
            {
                F<PasswordBox>("APw").Password = ""; F<PasswordBox>("APw2").Password = "";
                var err = t.Exception != null ? t.Exception.GetBaseException().Message : t.Result;
                if (err != null) F<TextBlock>("AdminMsg").Text = "⚠ " + err; else { LoadAdmin(); F<TextBlock>("AdminMsg").Text = "✅ 저장했어요"; Toast("관리자 계정을 저장했어요"); }
            }));
        }
    }
}
