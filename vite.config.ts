import { defineConfig } from "vite";
import monkey, { cdn } from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "秒传链接提取",
        description: "大道至简，这是一个全新开发的百度网盘秒传链接提取脚本。",
        icon: "https://vitejs.dev/logo.svg",
        namespace: "https://github.com/vscodev",
        author: "vscodev",
        homepageURL: 'https://github.com/vscodev/rapid-upload-userscript',
        license: "gpl-3.0",
        match: [
          "*://pan.baidu.com/disk/main*",
          "*://yun.baidu.com/disk/main*",
          "*://wangpan.baidu.com/disk/main*",
        ],
      },
      build: {
        externalGlobals: {
          'sweetalert2': cdn.jsdelivr('Swal', 'dist/sweetalert2.all.min.js'),
        }
      }
    }),
  ],
});
