import moment from "moment";

export function timeAgo(milliseconds: number) {
  if (new Date().getTime() - milliseconds < 15 * 60 * 1000) {
    return "less than 15 minutes ago";
  }
  return moment(milliseconds).fromNow();
}
