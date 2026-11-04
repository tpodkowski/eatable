import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "@eatable/shared";
import { fetchUserProfile, updateUserProfile } from "../../lib/profileApi";
import { isValidUserProfile } from "./profileForm";

const DEFAULT_PROFILE: UserProfile = {
  dailyCalorieLimit: 2000,
  dailyProteinLimit: 100,
  dailyCarbohydratesLimit: 250,
  dailyFatLimit: 67,
};

export function useProfileSettings(isSignedIn: boolean) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const savedProfile = useRef<UserProfile>(DEFAULT_PROFILE);
  const latestSave = useRef(0);

  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    void fetchUserProfile()
      .then((loadedProfile) => {
        if (!active) return;
        savedProfile.current = loadedProfile;
        initialLoadComplete.current = true;
        setProfile(loadedProfile);
      })
      .catch(() => {
        if (active) setMessage("errors.profileLoadFailed");
      });
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !initialLoadComplete.current) return;
    if (JSON.stringify(profile) === JSON.stringify(savedProfile.current)) {
      latestSave.current += 1;
      setIsSaving(false);
      setMessage(null);
      return;
    }
    if (!isValidUserProfile(profile)) {
      setIsSaving(false);
      setMessage("errors.invalidUserProfile");
      return;
    }

    const saveId = ++latestSave.current;
    setIsSaving(true);
    setMessage(null);
    const timeout = setTimeout(() => {
      void updateUserProfile(profile)
        .then(() => {
          if (latestSave.current === saveId) {
            savedProfile.current = profile;
            setMessage("settings.profileSaved");
          }
        })
        .catch((error) => {
          if (latestSave.current === saveId) {
            setMessage(error instanceof Error && error.message === "invalidUserProfile"
              ? "errors.invalidUserProfile"
              : "errors.profileSaveFailed");
          }
        })
        .finally(() => {
          if (latestSave.current === saveId) setIsSaving(false);
        });
    }, 500);
    return () => clearTimeout(timeout);
  }, [isSignedIn, profile]);

  return { profile, setProfile, isSaving, message };
}
