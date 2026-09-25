/** 同一台机器的备注按这个键归在一起。去掉首尾空格和 IPv6 方括号，忽略大小写。 */
export function hostKeyOf(host: string): string {
  return host.trim().toLowerCase().replace(/^\[|\]$/g, '') || 'unknown'
}
