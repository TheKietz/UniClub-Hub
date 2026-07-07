import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env } from 'process';

const isDockerBuild = env.VITE_DOCKER_BUILD === '1';

function buildDevServerConfig(): Record<string, unknown> | undefined {
    if (isDockerBuild) return undefined;

    const baseFolder =
        env.APPDATA !== undefined && env.APPDATA !== ''
            ? `${env.APPDATA}/ASP.NET/https`
            : `${env.HOME}/.aspnet/https`;

    const certificateName = "uniclub-hub.client";
    const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
    const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder, { recursive: true });
    }

    if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        if (0 !== child_process.spawnSync('dotnet', [
            'dev-certs',
            'https',
            '--export-path',
            certFilePath,
            '--format',
            'Pem',
            '--no-password',
        ], { stdio: 'inherit', }).status) {
            throw new Error("Could not create certificate.");
        }
    }

    // Cổng backend khi chạy dev. Ưu tiên biến môi trường do SpaProxy/Visual Studio
    // truyền vào; nếu không có (vd chạy `dotnet run` theo profile "http"), fallback
    // về http://localhost:5015 — đúng cổng mà `dotnet run` bind mặc định.
    const target = env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` :
        env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'http://localhost:5015';

    return {
        proxy: {
            '^/api': {
                target,
                secure: false,
                ws: true
            },
            // SignalR (Kanban realtime) — cần proxy cả /hubs, kèm WebSocket
            '^/hubs': {
                target,
                secure: false,
                ws: true
            },
            '^/weatherforecast': {
                target,
                secure: false
            }
        },
        port: parseInt(env.DEV_SERVER_PORT || '54610'),
        https: {
            key: fs.readFileSync(keyFilePath),
            cert: fs.readFileSync(certFilePath),
        },
        host: true
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [plugin(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            html2canvas: path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'node_modules/html2canvas-pro/dist/html2canvas-pro.esm.js'),
        }
    },
    server: command === 'serve' ? buildDevServerConfig() : undefined,
}))
