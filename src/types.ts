export interface FileInfo {
  path: string;
  size: string;
  blockList: string[];
  contentMd5: string;
  sliceMd5: string;
}

export interface LoginInfo {
  bdstoken: string;
}

export interface LoginResponse {
  errno: number;
  show_msg: string;
  login_info?: LoginInfo;
}

export interface RapidUploadResponse {
  errno: number; // 错误码
  return_type: number; // 返回类型，1 文件在云端不存在、2 文件在云端已存在
}
