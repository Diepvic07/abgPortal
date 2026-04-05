import slugify from 'slugify';

slugify.extend({
  đ: 'd',
  Đ: 'D',
});

const PROFILE_SLUG_SUFFIX_LENGTH = 5;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ProfileLinkable {
  id: string;
  name?: string | null;
  public_profile_slug?: string | null;
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function slugifyMemberName(name?: string | null): string {
  const base = slugify(name || 'member', {
    lower: true,
    strict: true,
    trim: true,
    locale: 'vi',
  });

  return base || 'member';
}

export function getProfileSlugSuffix(id: string): string {
  return id.replace(/-/g, '').slice(0, PROFILE_SLUG_SUFFIX_LENGTH);
}

export function generateProfileSlug(name: string | null | undefined, id: string): string {
  return `${slugifyMemberName(name)}-${getProfileSlugSuffix(id)}`;
}

export function getMemberProfileSlug(member: ProfileLinkable): string {
  return member.public_profile_slug || generateProfileSlug(member.name, member.id);
}

export function getInternalProfileUrl(member: ProfileLinkable): string {
  return `/profile/${getMemberProfileSlug(member)}`;
}

export function getPublicProfileUrl(slug: string): string {
  return `/profile/public/${slug}`;
}

export function getMemberPublicProfileUrl(member: ProfileLinkable): string {
  return getPublicProfileUrl(getMemberProfileSlug(member));
}
