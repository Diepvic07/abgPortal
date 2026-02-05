
export interface DatingProfile {
    id: string;
    nickname: string;
    contact_email: string;
    location: string;
    match_preferences: string; // What kind of partner they are looking for
    birth_year: string;
    gender: string;
    career_field: string;
    self_description: string; // 3 words
    truth_lie: string; // 2 truths 1 lie
    ideal_day: string;
    qualities_looking_for: string; // Qualities in partner
    core_values: string;
    deal_breakers: string;
    interests: string; // Hobbies/Interests
    message: string; // Message to reader
    other_share: string;
    created_at: string;
}
