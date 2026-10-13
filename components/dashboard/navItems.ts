import {
  IconBan,
  IconCalendarPlus,
  IconCalendarStats,
  IconCash,
  IconFlame,
  IconHome,
  IconSettings,
  IconUser,
  type Icon,
} from "@tabler/icons-react";

export type NavLinkItem = {
  title: string;
  href: string;
  icon: Icon;
  match: (pathname: string) => boolean;
};

export const PRIMARY_NAV_ITEMS: NavLinkItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: IconHome,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    title: "Payments",
    href: "/dashboard/payments",
    icon: IconCash,
    match: (pathname) => pathname.startsWith("/dashboard/payments"),
  },
];

export const SECONDARY_NAV_ITEMS: NavLinkItem[] = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: IconUser,
    match: (pathname) => pathname.startsWith("/dashboard/profile"),
  },
];

export const PROFILE_NAV_HREF = "/dashboard/profile";

export const ADD_LINK_ACTIONS: { title: string; href: string; icon: Icon }[] = [
  { title: "Booking", href: "/dashboard/bookings/new", icon: IconCalendarPlus },
  { title: "Block", href: "/dashboard/blocked", icon: IconBan },
  { title: "Hot dates", href: "/dashboard/hot-dates", icon: IconFlame },
  {
    title: "Booking period",
    href: "/dashboard/booking-period",
    icon: IconCalendarStats,
  },
];
