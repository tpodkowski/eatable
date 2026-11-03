import { useEffect, useState } from "react";
import type { UserProfile } from "@eatable/shared";
import { fetchUserProfile } from "../../lib/profile-api";

export function useDashboardProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    let active = true;
    void fetchUserProfile()
      .then((loadedProfile) => {
        if (active) setProfile(loadedProfile);
      })
      .catch(() => {
        if (active) setProfile(null);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return profile;
}
