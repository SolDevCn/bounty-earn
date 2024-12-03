/**
 * 倒计时渲染器组件
 * 用于格式化显示倒计时时间
 */

/**
 * CountDownRenderer组件
 * @param {object} props - 组件属性
 * @param {number} props.days - 剩余天数
 * @param {number} props.hours - 剩余小时数
 * @param {number} props.minutes - 剩余分钟数
 * @param {number} props.seconds - 剩余秒数
 * 
 * 功能：
 * 1. 当剩余天数大于0时，显示格式：天:时:分
 * 2. 当剩余天数为0时，显示格式：时:分:秒
 * 3. 自动根据剩余时间调整显示格式
 */
export const CountDownRenderer = ({
  days,
  hours,
  minutes,
  seconds,
}: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}) => {
  // 根据是否有剩余天数选择不同的显示格式
  if (days > 0) {
    return <span>{`${days}d:${hours}h:${minutes}m`}</span>;
  }
  return <span>{`${hours}h:${minutes}m:${seconds}s`}</span>;
};
