export const calculateVersion = (gitInfo: any, config: any): string => {
  return `${config["tag-prefix"]}${gitInfo.version}`;
};
