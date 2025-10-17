'use client';

export const OPEN_LAB_DRAWER_EVENT = 'siosi:openLabDrawer';

interface LabDrawerEventDetail {
  index: number;
}

export function openLabDrawer(index: number) {
  window.dispatchEvent(
    new CustomEvent<LabDrawerEventDetail>(OPEN_LAB_DRAWER_EVENT, {
      detail: { index },
    }),
  );
}
