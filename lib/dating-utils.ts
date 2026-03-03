import { DatingProfile } from '@/types/dating';
import { Member } from '@/types';

/**
 * Check if a member's dating profile has all required fields filled.
 */
export function isDatingProfileComplete(member: Member): {
  complete: boolean;
  missingFields: string[];
} {
  const requiredFields: Array<{ key: keyof Member; label: string }> = [
    { key: 'nickname', label: 'Nickname' },
    { key: 'gender', label: 'Gender' },
    { key: 'self_description', label: 'Self Description' },
    { key: 'interests', label: 'Interests' },
    { key: 'core_values', label: 'Core Values' },
  ];

  const missingFields = requiredFields
    .filter(f => !member[f.key])
    .map(f => f.label);

  return { complete: missingFields.length === 0, missingFields };
}

/**
 * Filters dating profiles based on the seeker's gender preference.
 *
 * @param seekerPreference - The match_preferences field from seeker's profile (e.g., "Tìm Nam", "Tìm Nữ", "Bất kỳ")
 * @param profiles - Array of available dating profiles to filter
 * @returns Filtered array of profiles matching the gender preference
 */
export function filterByGenderPreference(
    seekerPreference: string,
    profiles: DatingProfile[]
): DatingProfile[] {
    if (!seekerPreference) {
        return profiles; // No preference specified, return all
    }

    const prefLower = seekerPreference.toLowerCase();

    // Check for explicit gender preferences
    const wantsMale = prefLower.includes('nam') || prefLower.includes('male');
    const wantsFemale = prefLower.includes('nữ') || prefLower.includes('female') || prefLower.includes('nu');
    const wantsAny = prefLower.includes('bất kỳ') || prefLower.includes('any') || prefLower.includes('both');

    // If seeking both or any, return all profiles
    if (wantsAny || (wantsMale && wantsFemale)) {
        return profiles;
    }

    // Filter by specific gender
    if (wantsMale) {
        return profiles.filter(p => {
            const gender = p.gender.toLowerCase();
            return gender === 'nam' || gender === 'male' || gender.startsWith('nam');
        });
    }

    if (wantsFemale) {
        return profiles.filter(p => {
            const gender = p.gender.toLowerCase();
            return gender === 'nữ' || gender === 'female' || gender === 'nu' || gender.startsWith('nữ');
        });
    }

    // Default: return all if we can't parse the preference
    return profiles;
}
