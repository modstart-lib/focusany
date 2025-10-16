import { FileType, screen as nutScreen, Region } from '@nut-tree-fork/nut-js';
import { BrowserWindow, ipcMain, nativeImage, screen } from 'electron';
import { unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import { isLinux, isMac, isWin } from "../../../lib/env";
import { AppsMain } from "../../app/main";

let currentPromise: Promise<void> | null = null;

export const colorPicker = async (): Promise<void> => {
    if (currentPromise) {
        return currentPromise;
    }
    currentPromise = new Promise<void>((resolve) => {
        let magnifierWindow: BrowserWindow | null = null;
        let isPicking = true;
        let updateTimer: NodeJS.Timeout | null = null;
        let updating = false;
        let currentColor: string = '#FFFFFF';
        let bitmaps: {
            display: any;
            bitmap: Uint8Array;
            size: { width: number; height: number };
            scaleFactor: number;
            originalPhysicalX: number;
            originalPhysicalY: number;
            clampedPhysicalX: number;
            clampedPhysicalY: number
        }[] = [];

        const cleanup = () => {
            if (updateTimer) {
                clearTimeout(updateTimer);
                updateTimer = null;
            }
            if (magnifierWindow) {
                magnifierWindow.close();
                magnifierWindow = null;
            }
            ipcMain.off('copy-color', copyHandler);
        };

        const copyHandler = () => {
            AppsMain.setClipboardText(currentColor);
            AppsMain.toast(`颜色 ${currentColor} 已复制到剪贴板`);
            isPicking = false;
            resolve();
            cleanup();
        };

        ipcMain.on('copy-color', copyHandler);

        // HTML for magnifier
        const copyShortcut = isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        margin: 0;
                        overflow: hidden;
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 5px;
                        display: flex;
                        gap: 10px;
                        padding: 10px;
                        position: relative;
                    }
                    #magnifier {
                        width: 100px;
                        height: 100px;
                        border-radius: 5px;
                    }
                    .right-panel {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        flex-grow: 1;
                        border-radius: 5px;
                    }
                    .color-preview {
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-family: monospace;
                        font-size: 14px;
                        font-weight: bold;
                        border: 1px solid #000;
                        border-radius: 5px;
                    }
                    .shortcut-text {
                        font-family: monospace;
                        font-size: 12px;
                        color: #666;
                        display: flex;
                        align-items: center;
                    }
                </style>
            </head>
            <body>
                <canvas id="magnifier" width="100" height="100"></canvas>
                <div class="right-panel">
                    <div class="color-preview" id="colorPreview">#FFFFFF</div>
                    <div class="shortcut-text">复制 ${copyShortcut}</div>
                    <div class="shortcut-text">退出 ESC</div>
                </div>
                <script>
                    const { ipcRenderer } = require('electron');
                    const canvas = document.getElementById('magnifier');
                    const ctx = canvas.getContext('2d');
                    const dpr = window.devicePixelRatio || 1;
                    canvas.width = 100 * dpr;
                    canvas.height = 100 * dpr;
                    ctx.scale(dpr, dpr);
                    window.electronAPI = {
                        updateMagnifier: (imageData) => {
                            ctx.clearRect(0, 0, 100, 100);
                            // Draw pixel grid
                            const pixelSize = 5;
                            for (let j = 0; j < 20; j++) {
                                for (let i = 0; i < 20; i++) {
                                    const index = (j * 20 + i) * 4;
                                    const r = imageData[index];
                                    const g = imageData[index + 1];
                                    const b = imageData[index + 2];
                                    ctx.fillStyle = \`rgb(\${r},\${g},\${b})\`;
                                    ctx.fillRect(i * pixelSize, j * pixelSize, pixelSize, pixelSize);
                                }
                            }
                            // Draw grid lines
                            ctx.strokeStyle = 'black';
                            ctx.lineWidth = 1 / dpr;
                            for (let x = 0; x <= 100; x += pixelSize) {
                                ctx.beginPath();
                                ctx.moveTo(x, 0);
                                ctx.lineTo(x, 100);
                                ctx.stroke();
                            }
                            for (let y = 0; y <= 100; y += pixelSize) {
                                ctx.beginPath();
                                ctx.moveTo(0, y);
                                ctx.lineTo(100, y);
                                ctx.stroke();
                            }
                            // Draw crosshair at center of middle pixel
                            ctx.strokeStyle = 'red';
                            ctx.lineWidth = 2 / dpr;
                            ctx.beginPath();
                            ctx.moveTo(50, 0);
                            ctx.lineTo(50, 100);
                            ctx.moveTo(0, 50);
                            ctx.lineTo(100, 50);
                            ctx.stroke();
                        },
                        updateColor: (color) => {
                            const preview = document.getElementById('colorPreview');
                            preview.style.backgroundColor = color;
                            preview.textContent = color;
                            // 计算亮度
                            const r = parseInt(color.slice(1,3),16);
                            const g = parseInt(color.slice(3,5),16);
                            const b = parseInt(color.slice(5,7),16);
                            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                            preview.style.color = brightness > 128 ? '#000' : '#fff';
                        }
                    };
                </script>
            </body>
            </html>
        `;

        // Create magnifier window
        magnifierWindow = new BrowserWindow({
            width: 350,
            height: 120,
            frame: false,
            transparent: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        magnifierWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        magnifierWindow.once('ready-to-show', async () => {
            magnifierWindow!.on('closed', () => {
                uIOhook.off('mousemove', mouseMoveCallback);
                uIOhook.off('keydown', keyDownCallback);
            });
            const totalWidth = await nutScreen.width();
            const totalHeight = await nutScreen.height();
            const displays = screen.getAllDisplays();
            const screenshots = await Promise.all(displays.map(async display => {
                try {
                    const scaleFactor = display.scaleFactor;
                    const physicalX = Math.round(display.bounds.x * scaleFactor);
                    const physicalY = Math.round(display.bounds.y * scaleFactor);
                    const physicalWidth = Math.round(display.bounds.width * scaleFactor);
                    const physicalHeight = Math.round(display.bounds.height * scaleFactor);
                    const originalPhysicalX = physicalX;
                    const originalPhysicalY = physicalY;
                    const clampedPhysicalX = Math.max(0, physicalX);
                    const clampedPhysicalY = Math.max(0, physicalY);
                    const clampedPhysicalWidth = Math.min(physicalWidth, totalWidth - clampedPhysicalX);
                    const clampedPhysicalHeight = Math.min(physicalHeight, totalHeight - clampedPhysicalY);
                    const region = new Region(clampedPhysicalX, clampedPhysicalY, clampedPhysicalWidth, clampedPhysicalHeight);
                    const fileName = `color-picker-${display.id}-${Date.now()}`;
                    const capturePath = await (nutScreen.captureRegion as any)(fileName, region, FileType.PNG, tmpdir());
                    if (typeof capturePath !== 'string') {
                        console.error('Unexpected capture path:', capturePath);
                        return null;
                    }
                    const image = nativeImage.createFromPath(capturePath);
                    unlinkSync(capturePath);
                    const bitmap = image.getBitmap() as any;
                    const size = image.getSize();
                    return {
                        display,
                        bitmap,
                        size,
                        scaleFactor,
                        originalPhysicalX,
                        originalPhysicalY,
                        clampedPhysicalX,
                        clampedPhysicalY
                    };
                } catch (error) {
                    console.error('Error capturing display:', error);
                    return null;
                }
            }));
            bitmaps = screenshots.filter((item): item is {
                display: any;
                bitmap: Uint8Array;
                size: { width: number; height: number };
                scaleFactor: number;
                originalPhysicalX: number;
                originalPhysicalY: number;
                clampedPhysicalX: number;
                clampedPhysicalY: number
            } => Boolean(item));
            await updateMagnifier();
            magnifierWindow!.show();
        });

        const updateMagnifier = async () => {
            if (!isPicking || updating || bitmaps.length === 0) return;
            updating = true;
            try {
                const mousePos = screen.getCursorScreenPoint();
                const display = screen.getDisplayNearestPoint(mousePos);
                const bitmapData = bitmaps.find(b => b.display.id === display.id);
                if (!bitmapData) return;
                const {
                    bitmap,
                    size,
                    scaleFactor,
                    originalPhysicalX,
                    originalPhysicalY,
                    clampedPhysicalX,
                    clampedPhysicalY
                } = bitmapData;
                const offsetX = Math.round((mousePos.x - display.bounds.x) * scaleFactor + (originalPhysicalX - clampedPhysicalX));
                const offsetY = Math.round((mousePos.y - display.bounds.y) * scaleFactor + (originalPhysicalY - clampedPhysicalY));
                const colors: number[] = [];
                for (let dy = -9; dy <= 10; dy++) {
                    for (let dx = -9; dx <= 10; dx++) {
                        const px = offsetX + dx;
                        const py = offsetY + dy;
                        if (px < 0 || px >= size.width || py < 0 || py >= size.height) {
                            colors.push(255, 255, 255, 255); // white
                        } else {
                            const index = (py * size.width + px) * 4;
                            const r = bitmap[index + 2];
                            const g = bitmap[index + 1];
                            const b = bitmap[index];
                            const a = bitmap[index + 3];
                            colors.push(r, g, b, a);
                        }
                    }
                }
                const imageData = new Uint8ClampedArray(colors);
                magnifierWindow!.webContents.executeJavaScript(`
                    window.electronAPI.updateMagnifier(${JSON.stringify(Array.from(imageData))});
                `);
                // Get current color at mouse position
                const centerIndex = (10 * 21 + 10) * 4; // Center pixel
                const r = colors[centerIndex];
                const g = colors[centerIndex + 1];
                const b = colors[centerIndex + 2];
                const hex = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
                currentColor = hex;
                magnifierWindow!.webContents.executeJavaScript(`
                    window.electronAPI.updateColor('${hex}');
                `);
                // Position window in top-right or top-left based on mouse position
                const windowBounds = magnifierWindow!.getBounds();
                const isMouseInTopRight = mousePos.x > display.bounds.x + display.bounds.width * 0.75 && mousePos.y < display.bounds.y + display.bounds.height * 0.25;
                let x, y;
                if (isMouseInTopRight) {
                    x = display.bounds.x;
                    y = display.bounds.y;
                } else {
                    x = display.bounds.x + display.bounds.width - windowBounds.width;
                    y = display.bounds.y;
                }
                magnifierWindow!.setPosition(x, y);
            } catch (error) {
                console.error('Error updating magnifier:', error);
            } finally {
                updating = false;
            }
        };
        // Listen to mouse events
        const mouseMoveCallback = () => {
            updateMagnifier();
        };
        const keyDownCallback = (event: any) => {
            if (!isPicking) return;
            if (
                (isMac && event.metaKey && event.shiftKey && event.keycode === UiohookKey.C)
                || ((isWin || isLinux) && event.ctrlKey && event.shiftKey && event.keycode === UiohookKey.C)
            ) {
                AppsMain.setClipboardText(currentColor);
                AppsMain.toast(`颜色 ${currentColor} 已复制到剪贴板`);
                isPicking = false;
                resolve();
                cleanup();
            } else if (event.keycode === UiohookKey.Escape) { // ESC to exit
                isPicking = false;
                resolve(); // Or currentColor, but exit without copying
                cleanup();
            }
        };
        uIOhook.on('mousemove', mouseMoveCallback);
        uIOhook.on('keydown', keyDownCallback);

        // Initial update
        mouseMoveCallback();
    });
};
