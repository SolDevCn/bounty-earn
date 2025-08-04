import { countries } from '@/constants';
import { Superteams } from '@/constants/Superteam';
import type {
  Listing,
  ListingWithSubmissions,
  StatusFilter,
} from '@/features/listings';
import { dayjs } from '@/utils/dayjs';

export const formatDeadline = (
  deadline: string | undefined,
  type: string | undefined,
) => {
  if (type === 'grant') {
    return 'Ongoing';
  }
  return deadline ? dayjs(deadline).format("DD MMM'YY h:mm A") : '-';
};

export const isDeadlineOver = (deadline: string | Date | undefined) =>
  deadline ? dayjs().isAfter(dayjs(deadline)) : false;

export const getRegionTooltipLabel = (
  _region: string | undefined,
  _isGrant: boolean = false,
) => {
  return '这个任务对所有人开放';
  // const country = countries.find(
  //   (country) => country.name.toLowerCase() === region?.toLowerCase(),
  // )?.name;

  // switch (region) {
  //   case 'GLOBAL':
  //     return '这个任务对所有人开放';
  //   case 'BALKAN':
  //     return `You need to be a resident of one of the Balkan countries to be able to participate in this ${isGrant ? 'grant' : 'listing'}`;
  //   default:
  //     return `You need to be a resident of ${country} to participate in this ${isGrant ? 'grant' : 'listing'} `;
  // }
};

export const getListingDraftStatus = (
  status: string | undefined,
  isPublished: boolean | undefined,
) => {
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'REVIEW') return 'REVIEW';
  if (status === 'PREVIEW') return 'PREVIEW';
  if (status === 'VERIFYING') return 'VERIFYING';
  if (status === 'VERIFY_FAIL') return 'VERIFY_FAIL';
  if (isPublished) return 'PUBLISHED';
  return 'DRAFT';
};

export const getListingTypeLabel = (type: string) => {
  if (type === 'project') return '定向任务';
  if (type === 'hackathon') return '黑客松';
  if (type === 'bounty') return '赏金任务';
  if (type === 'grant') return 'Grant';
  return;
};

export const listingStatusCN = {
  Draft: '草稿',
  'Under Verification': '验证中',
  'Verification Failed': '验证失败',
  Ongoing: '进行中',
  Closed: '关闭',
  'In Progress': '进行中',
  'Fndn to Pay': 'Fndn to Pay',
  'Payment Pending': '等待支付',
  Completed: '已完成',
  'In Review': '审核中',
};

export const getListingStatus = (
  listing: Listing | ListingWithSubmissions | any,
  isGrant?: boolean,
) => {
  if (!listing) return 'Draft';

  const listingStatus = getListingDraftStatus(
    listing?.status,
    listing?.isPublished,
  );
  const hasDeadlinePassed = isDeadlineOver(listing?.deadline || '');

  if (listingStatus === 'PREVIEW') return 'Draft';
  if (listingStatus === 'VERIFYING') return 'Under Verification';
  if (listingStatus === 'VERIFY_FAIL') return 'Verification Failed';
  if (listingStatus === 'DRAFT') return 'Draft';
  if (listing?.type === 'grant' || isGrant) return 'Ongoing';

  switch (listingStatus) {
    case 'CLOSED':
      return 'Closed';
    case 'REVIEW':
    case 'PUBLISHED':
      if (!hasDeadlinePassed && !listing?.isWinnersAnnounced)
        return 'In Progress';
      if (!listing?.isWinnersAnnounced) return 'In Review';
      if (
        listing?.isWinnersAnnounced &&
        listing?.totalPaymentsMade !== listing?.totalWinnersSelected &&
        listing?.isFndnPaying
      )
        return 'Fndn to Pay';
      if (
        listing?.isWinnersAnnounced &&
        listing?.totalPaymentsMade !== listing?.totalWinnersSelected
      )
        return 'Payment Pending';
      if (
        listing?.isWinnersAnnounced &&
        listing?.totalPaymentsMade === listing?.totalWinnersSelected
      )
        return 'Completed';
      return 'In Review';
    default:
      return 'Draft';
  }
};

export const getColorStyles = (status: string) => {
  switch (status) {
    case 'Published':
    case 'Completed':
      return { bgColor: '#D1FAE5', color: '#0D9488' };
    case 'Under Verification':
    case 'Fndn to Pay':
      return { bgColor: 'pink.100', color: 'pink.500' };
    case 'Payment Pending':
      return { bgColor: '#ffecb3', color: '#F59E0B' };
    case 'Verification Failed':
      return { bgColor: 'red.100', color: 'red.400' };
    case 'Preview':
    case 'Draft':
      return { bgColor: 'brand.slate.100', color: 'brand.slate.400' };
    case 'In Review':
      return { bgColor: 'cyan.100', color: 'cyan.600' };
    case 'In Progress':
      return { bgColor: '#F3E8FF', color: '#8B5CF6' };
    case 'Ongoing':
      return { bgColor: '#F3E8FF', color: '#8B5CF6' };
    default:
      return { bgColor: 'gray', color: 'white' };
  }
};

export function tweetTemplate(url: string) {
  return `最新的结果已经公布@solana_zh。恭喜获奖者👏👏

${url}
`;
}

export function userRegionEligibilty(
  _region: string | undefined,
  _userLocation: string | undefined,
) {
  return true;

  // if (region === 'GLOBAL') {
  //   return true;
  // }

  // const regionObject = region ? getCombinedRegion(region) : null;

  // const isEligible =
  //   !!(
  //     userLocation &&
  //     (regionObject?.name === userLocation ||
  //       regionObject?.country?.includes(userLocation))
  //   ) || false;

  // return isEligible;
}

export function isValidUrl(url: string): boolean {
  const urlPattern =
    /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?].*)?$/;
  return urlPattern.test(url);
}
export function digitsInLargestString(numbers: string[]): number {
  const largest = numbers.reduce((max, current) => {
    const cleanedCurrent = current.replace(/[,\.]/g, '');
    const cleanedMax = max.replace(/[,\.]/g, '');

    return cleanedCurrent.length > cleanedMax.length
      ? current
      : cleanedCurrent.length === cleanedMax.length &&
          cleanedCurrent > cleanedMax
        ? current
        : max;
  }, '');

  return largest.replace(/[,\.]/g, '').length;
}

export function getStatusFilterQuery(statusFilter: StatusFilter | undefined) {
  let statusFilterQuery = {};

  if (statusFilter) {
    if (statusFilter === 'open') {
      statusFilterQuery = {
        deadline: {
          gte: new Date(),
        },
      };
    } else if (statusFilter === 'review') {
      statusFilterQuery = {
        deadline: {
          lte: new Date(),
        },
        isWinnersAnnounced: false,
      };
    } else if (statusFilter === 'completed') {
      statusFilterQuery = {
        isWinnersAnnounced: true,
      };
    }
  }

  return statusFilterQuery;
}

export const getListingIcon = (type: string) => {
  switch (type) {
    case 'bounty':
      return '/assets/icons/bolt.svg';
    case 'project':
      return '/assets/icons/briefcase.svg';
    case 'hackathon':
      return '/assets/icons/laptop.svg';
    case 'grant':
      return '/assets/icons/bank.svg';
    default:
      return '/assets/icons/bolt.svg';
  }
};

export const getListingTypeCN = (type: string) => {
  switch (type) {
    case 'bounty':
      return '赏金任务';
    case 'project':
      return '定向任务';
    case 'hackathon':
      return '黑客松';
    case 'grant':
      return '资助';
    default:
      return '赏金任务';
  }
};

export const getCombinedRegion = (region: string) => {
  let regionObject:
    | {
        name: string;
        code: string;
        country?: string[];
        displayValue?: string;
      }
    | undefined;
  regionObject = countries.find(
    (country) => country.name.toLowerCase() === region?.toLowerCase(),
  );
  if (!regionObject) {
    regionObject = Superteams.find(
      (superteam) =>
        superteam.displayValue.toLowerCase() === region?.toLowerCase(),
    );
    if (regionObject?.displayValue) {
      regionObject.name = regionObject.displayValue;
    }
  }

  return regionObject;
};
