"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AccountValues,
  ContactValues,
  OnlinePresenceValues,
  PaymentsValues,
} from "./schema";

export const STEPS = [
  { id: "account", title: "Your business" },
  { id: "contact", title: "Contact details" },
  { id: "onlinePresence", title: "Online presence" },
  { id: "payments", title: "Payments" },
  { id: "review", title: "Review" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

type Answers = {
  account?: AccountValues;
  contact?: ContactValues;
  onlinePresence?: OnlinePresenceValues;
  payments?: PaymentsValues;
};

type Submission = { businessName: string; referenceId?: string };

type OnboardingState = {
  stepIndex: number;
  /** Set when a step is opened from the review screen's "Edit" link. */
  returnToReview: boolean;
  accountExists: boolean;
  answers: Answers;
  submission?: Submission;
  notice?: string;
  goToStep: (stepId: StepId) => void;
  completeStep: <K extends keyof Answers>(args: {
    step: K;
    values: NonNullable<Answers[K]>;
  }) => void;
  back: () => void;
  markAccountCreated: () => void;
  markSubmitted: (submission: Submission) => void;
  reset: () => void;
  /** Starts over with a message explaining why (e.g. the draft expired). */
  restart: (notice: string) => void;
  dismissNotice: () => void;
};

const REVIEW_INDEX = STEPS.length - 1;

const initialState = {
  stepIndex: 0,
  returnToReview: false,
  accountExists: false,
  answers: {},
  submission: undefined,
  notice: undefined,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      goToStep: (stepId) =>
        set({
          stepIndex: STEPS.findIndex((step) => step.id === stepId),
          returnToReview: true,
        }),
      completeStep: ({ step, values }) =>
        set((state) => ({
          answers: { ...state.answers, [step]: values },
          stepIndex: state.returnToReview
            ? REVIEW_INDEX
            : Math.min(state.stepIndex + 1, REVIEW_INDEX),
          returnToReview: false,
        })),
      back: () =>
        set((state) => ({
          stepIndex: Math.max(state.stepIndex - 1, 0),
          returnToReview: false,
        })),
      markAccountCreated: () => set({ accountExists: true }),
      markSubmitted: (submission) => set({ submission }),
      reset: () => set(initialState),
      restart: (notice) => set({ ...initialState, notice }),
      dismissNotice: () => set({ notice: undefined }),
    }),
    {
      name: "za-onboarding",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/** False during SSR and the first client render, so persisted state can't cause a hydration mismatch. */
export function useOnboardingHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useOnboardingStore.persist.onFinishHydration(onChange),
    () => useOnboardingStore.persist.hasHydrated(),
    () => false,
  );
}
