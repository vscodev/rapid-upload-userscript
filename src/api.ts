import { GM_xmlhttpRequest } from "$";
import { FileInfo, LoginResponse, RapidUploadResponse } from "./types";

const HOST = location.host;
const CHECK_LOGIN_URL = `https://${HOST}/api/loginStatus?clienttype=0&app_id=250528&web=1&channel=chunlei`;
const PRE_CREATE_URL = `https://${HOST}/api/precreate?app_id=250528&clienttype=21`;
// const RAPID_UPLOAD_URL = `https://${HOST}/api/rapidupload?app_id=250528&clienttype=21`;

export class ApiError extends Error {
  public readonly code: number;

  constructor(code: number, message?: string) {
    super(message ?? getErrorMessage(code));
    this.code = code;
    this.name = "ApiError";
  }

  toString(): string {
    return `${this.message}（错误码：${this.code}）`;
  }
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
    case 404:
      return "秒传md5不匹配";
    case 406:
      return "秒传创建文件失败";
    case 407:
      return "fileModify接口返回错误，未返回requestid";
    default:
      return "未知错误";
  }
}

export function checkLogin(): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: CHECK_LOGIN_URL,
      responseType: "json",
      onload: (result) => {
        const resp = result.response as LoginResponse;
        if (resp.errno === 0) {
          resolve();
        } else {
          reject(new ApiError(resp.errno, resp.show_msg));
        }
      },
      onerror: (err) => {
        reject(err);
      },
    });
  });
}

export function doRapidUpload(targetPath: string, fi: FileInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url: PRE_CREATE_URL,
      data: `path=${encodeURIComponent(targetPath + "/" + fi.path)}&size=${
        fi.size
      }&isdir=0&block_list=${JSON.stringify(
        fi.blockList.map((v) => v.toLowerCase())
      )}&autoinit=1&content-md5=${
        fi.contentMd5
      }&slice-md5=${fi.sliceMd5.toLowerCase()}&rtype=2`,
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
            reject(new ApiError(404, "秒传未生效"));
          }
        } else {
          reject(new ApiError(resp.errno));
        }
      },
      onerror: (err) => {
        reject(err);
      },
    });
  });
}
