import "./style.css";
import Swal from "sweetalert2";
import { FileInfo } from "./types";
import { ApiError, checkLogin, doRapidUpload } from "./api";

const MAX_ATTEMPTS = 3;

function parseRapidUploadLinks(inputValue: string): FileInfo[] {
  return inputValue
    .split(/\r?\n/g)
    .reduce((filtered: FileInfo[], link: string): FileInfo[] => {
      const matched = link
        .trim()
        .match(/^([a-f0-9]{32})#([a-f0-9]{32})#([0-9]{1,20})#(.+)/i);
      if (matched) {
        filtered.push({
          path: matched[4],
          size: matched[3],
          blockList: [""],
          contentMd5: matched[1],
          sliceMd5: matched[2],
        });
      }
      return filtered;
    }, []);
}

function getCurrentPath(): string {
  const matched = location.href.match(/path=(.+?)(?:&|$)/);
  if (matched) {
    return decodeURIComponent(matched[1]);
  }
  return "";
}

function randomizeTextCase(text: string): string {
  let ret = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase();
    if (Math.random() < 0.5) {
      ret += char;
    } else {
      ret += char.toUpperCase();
    }
  }
  return ret;
}

function sleep(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomIntInclusive(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}

async function tryRapidUpload(
  targetPath: string,
  fi: FileInfo,
  attempts: number
) {
  fi.contentMd5 =
    attempts === 0
      ? fi.contentMd5.toLowerCase()
      : randomizeTextCase(fi.contentMd5);
  try {
    await doRapidUpload(targetPath, fi);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.code === 404 &&
      attempts < MAX_ATTEMPTS
    ) {
      await sleep(getRandomIntInclusive(300, 1000));
      return tryRapidUpload(targetPath, fi, ++attempts);
    }
    throw err;
  }
}

async function newRapidUploadTask() {
  const result = await Swal.fire({
    title: "秒传链接提取",
    input: "textarea",
    inputPlaceholder:
      "请输入标准格式的秒传提取码，支持批量转存，多个链接以换行符分隔。",
    preConfirm: (inputValue: string) => {
      const fileList = parseRapidUploadLinks(inputValue);
      if (fileList.length === 0) {
        Swal.showValidationMessage(`未检测到有效的的秒传链接`);
      }
      return fileList;
    },
    showCancelButton: true,
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  });

  if (result.isConfirmed) {
    const fileList = result.value ?? [];
    if (fileList.length > 0) {
      const targetPath = getCurrentPath();

      let successCount = 0;
      let failureCount = 0;

      await Swal.fire({
        title: "文件转存中",
        html: `正在转存第 <b id="file-num"></b>/<b>${fileList.length}</b> 个文件`,
        willOpen: async () => {
          Swal.showLoading();
          const ele = Swal.getHtmlContainer()?.querySelector("#file-num");
          for (const [index, fi] of fileList.entries()) {
            if (ele) {
              ele.textContent = `${index + 1}`;
            }

            try {
              await tryRapidUpload(targetPath, fi, 0);
              successCount++;
            } catch (err) {
              console.error(err);
              failureCount++;
            }
          }
          Swal.close();
        },
        showConfirmButton: false,
      });

      Swal.fire({
        title: `转存完毕，成功${successCount}个，失败${failureCount}个`,
        confirmButtonText: "确定",
      }).then(() => {
        location.reload();
      });
    }
  }
}

function injectRapidUploadButton() {
  const btn = document.createElement("button");
  btn.setAttribute("id", "rapid-upload-button");
  btn.innerText = "秒传";
  btn.addEventListener("click", newRapidUploadTask);

  const toolBar = document.querySelector(".wp-s-agile-tool-bar__header");
  toolBar?.appendChild(btn);
}

function main() {
  checkLogin()
    .then(() => {
      injectRapidUploadButton();
    })
    .catch((err) => {
      console.error(err);
    });
}

main();
