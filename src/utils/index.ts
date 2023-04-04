/**
 * 获取缓存唯一键
 * 参数之间以作为 @ 分隔
 * @return {string}
 */
export function getCacheKey(...params) {
  return params.join('@')
}

/**
 * @description: 获取年龄-岁，年龄-天
 * @param {Date} birthDate
 * @param {Date} currentDate
 * @return {*}
 */
export function getAge(birthDate: Date, currentDate: Date): { years: number; days: number } {
  const diffTime = Math.abs(currentDate.getTime() - birthDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25)
  const years = Math.floor(diffYears)
  const daysWithoutYears = diffDays - years * 365.25
  return { years, days: daysWithoutYears }
}
