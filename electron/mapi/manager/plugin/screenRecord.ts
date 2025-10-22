import { spawn } from 'child_process';
import { BrowserWindow, desktopCapturer, dialog, screen } from 'electron';

let isRecording = false;
let ffmpegProcess: any = null;
let recordingWindow: BrowserWindow | null = null;
// let tray: Tray = (global as any).tray;

const screenRecord = async (): Promise<void> => {
    if (isRecording) {
        stopRecording();
        return;
    }

    // 选择保存路径
    const result = await dialog.showSaveDialog({
        title: '选择保存路径',
        defaultPath: 'screen_record.mp4',
        filters: [{name: 'MP4', extensions: ['mp4']}]
    });

    if (result.canceled) return;

    const savePath = result.filePath;

    // 获取屏幕源
    const sources = await desktopCapturer.getSources({types: ['screen']});
    if (sources.length === 0) return;

    // 选择屏幕，假设第一个
    const source = sources[0];
    const displays = screen.getAllDisplays();
    const display = displays.find(d => d.id === Number(source.display_id)) || displays[0];

    // 选择区域
    const bounds = await selectArea(display.bounds);
    if (!bounds) return;

    // 开始录制
    startRecording(savePath, source.id, bounds, display);
};

const selectArea = async (screenBounds: any): Promise<any> => {
    return new Promise((resolve) => {
        const win = new BrowserWindow({
            x: screenBounds.x,
            y: screenBounds.y,
            width: screenBounds.width,
            height: screenBounds.height,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
<html>
<body style="margin:0;padding:0;background:rgba(0,0,0,0.3);cursor:crosshair;" onmousedown="start(event)" onmousemove="move(event)" onmouseup="end(event)">
<div id="rect" style="position:absolute;border:2px solid red;display:none;"></div>
<script>
let startX, startY, isSelecting = false;
function start(e) {
  startX = e.clientX;
  startY = e.clientY;
  isSelecting = true;
  document.getElementById('rect').style.display = 'block';
}
function move(e) {
  if (!isSelecting) return;
  const rect = document.getElementById('rect');
  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  rect.style.left = x + 'px';
  rect.style.top = y + 'px';
  rect.style.width = w + 'px';
  rect.style.height = h + 'px';
}
function end(e) {
  if (!isSelecting) return;
  isSelecting = false;
  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  window.postMessage({type:'select', bounds:{x,y,width:w,height:h}}, '*');
}
window.addEventListener('message', (e) => {
  if (e.data.type === 'select') {
    console.log('SELECT:' + JSON.stringify(e.data.bounds));
  }
});
</script>
</body>
</html>
    `)}`);

        win.webContents.on('console-message', (event, level, message) => {
            if (message.startsWith('SELECT:')) {
                const bounds = JSON.parse(message.substring(7));
                win.close();
                resolve(bounds);
            }
        });

        win.on('closed', () => resolve(null));
    });
};

const startRecording = (savePath: string, sourceId: string, bounds: any, display: any) => {
    isRecording = true;

    // 创建录制指示器窗口
    recordingWindow = new BrowserWindow({
        x: display.bounds.x + bounds.x,
        y: display.bounds.y + bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    recordingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
<html>
<head>
<style>
body {
    margin: 0;
    padding: 0;
    background: transparent;
    border: 2px solid red;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    animation: blink 1s infinite;
}
@keyframes blink {
    0% { border-color: red; }
    50% { border-color: transparent; }
    100% { border-color: red; }
}
</style>
</head>
<body></body>
</html>
    `)}`);

    // 改变tray
    // if (tray) {
    //     // 假设停止图标路径
    //     const stopIconPath = path.join(__dirname, '../../../public/iconfont/stop.png'); // 需要实际图标
    //     tray.setImage(stopIconPath);
    //     tray.setToolTip('点击停止录制');
    //     tray.removeAllListeners('click');
    //     tray.on('click', () => stopRecording());
    // }

    // ffmpeg命令
    const platform = process.platform;
    let args: string[];
    if (platform === 'darwin') {
        const screenIndex = parseInt(sourceId.split(':')[1]) + 1;
        args = [
            '-f', 'avfoundation',
            '-i', `${screenIndex}`,
            '-vf', `crop=${bounds.width}:${bounds.height}:${bounds.x}:${bounds.y}`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '22',
            '-c:a', 'aac',
            savePath
        ];
    } else if (platform === 'win32') {
        args = [
            '-f', 'gdigrab',
            '-i', 'desktop',
            '-vf', `crop=${bounds.width}:${bounds.height}:${bounds.x}:${bounds.y}`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '22',
            savePath
        ];
    } else {
        args = [
            '-f', 'x11grab',
            '-i', ':0.0',
            '-vf', `crop=${bounds.width}:${bounds.height}:${bounds.x}:${bounds.y}`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '22',
            savePath
        ];
    }

    ffmpegProcess = spawn('ffmpeg', args);
    ffmpegProcess.on('close', () => {
        stopRecording();
    });
};

const stopRecording = () => {
    if (!isRecording) return;
    isRecording = false;
    if (ffmpegProcess) {
        ffmpegProcess.kill('SIGINT');
        ffmpegProcess = null;
    }

    // 关闭录制指示器窗口
    if (recordingWindow) {
        recordingWindow.close();
        recordingWindow = null;
    }

    // 恢复tray
    // if (tray) {
    //     const defaultIconPath = path.join(__dirname, '../../../public/static/tray/icon.png'); // 假设默认图标路径
    //     tray.setImage(defaultIconPath);
    //     tray.setToolTip('FocusAny');
    //     tray.removeAllListeners('click');
    //     // 恢复原始点击事件
    //     tray.on('click', () => {
    //         // 假设显示主界面
    //     });
    // }
};

export { screenRecord };

