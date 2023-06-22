import "./style.css";
import Swal from "sweetalert2";
import { GM_xmlhttpRequest } from "$";
import { FileInfo, LoginResponse, RapidUploadResponse } from "./types";

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

// https://pan.baidu.com/union/doc/okumlx17r
function getErrorMessage(errrno: number): string {
  switch (errrno) {
    case 0:
      return "请求成功";
    case 2:
    case 31023:
      return "参数错误";
    case 111:
      return "access token 失效";
    case -6:
      return "身份验证失败";
    case 6:
      return "不允许接入用户数据";
    case 31034:
      return "命中接口频控";
    case 2131:
      return "该分享不存在";
    case 10:
      return "转存文件已经存在";
    case -3:
    case -31066:
      return "文件不存在";
    case 11:
      return "自己发送的分享";
    case 255:
      return "转存数量太多";
    case 12:
      return "批量转存出错";
    case -1:
      return "权益已过期";
    case -7:
      return "文件或目录名错误或无权访问";
    case -10:
      return "容量不足";
    default:
      return "未知错误";
  }
}

function checkLogin(): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: "https://pan.baidu.com/api/loginStatus?clienttype=0&app_id=250528&web=1&channel=chunlei",
      responseType: "json",
      onload: (result) => {
        const resp = result.response as LoginResponse;
        if (resp.errno === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `获取用户登录状态失败，错误码：${resp.errno}（${resp.show_msg}）`
            )
          );
        }
      },
      onerror: (err) => {
        reject(err);
      },
    });
  });
}

function doRapidUpload(targetPath: string, fi: FileInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url: "https://pan.baidu.com/api/precreate?app_id=250528&clienttype=21",
      data: `path=${encodeURIComponent(targetPath + "/" + fi.path)}&size=${
        fi.size
      }&isdir=0&block_list=${JSON.stringify(
        fi.blockList.map((v) => v.toLowerCase())
      )}&autoinit=1&content-md5=${fi.contentMd5.toLowerCase()}&slice-md5=${fi.sliceMd5.toLowerCase()}&rtype=2`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      responseType: "json",
      onload: (result) => {
        const resp = result.response as RapidUploadResponse;
        if (resp.errno === 0) {
          if (resp.return_type === 2) {
            resolve();
          } else {
            reject(new Error("秒传未生效"));
          }
        } else {
          reject(new Error(getErrorMessage(resp.errno)));
        }
      },
      onerror: (err) => {
        reject(err);
      },
    });
  });
}

function getCurrentPath(): string {
  const matched = location.href.match(/path=(.+?)(?:&|$)/);
  if (matched) {
    return decodeURIComponent(matched[1]);
  }
  return "";
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
              await doRapidUpload(targetPath, fi);
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
