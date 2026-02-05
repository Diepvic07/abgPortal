import { DatingProfile } from '@/types/dating';

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
