import { BIO_MAX_LENGTH, HEADLINE_MAX_LENGTH } from "./validation";
import { TextAreaInput, TextInput } from "./Field";

interface AboutSectionProps {
  headline: string;
  bio: string;
  onHeadlineChange: (value: string) => void;
  onBioChange: (value: string) => void;
}

export function AboutSection({ headline, bio, onHeadlineChange, onBioChange }: AboutSectionProps) {
  return (
    <div className="space-y-5">
      <TextInput
        id="profile-headline"
        label="Professional Headline / Role"
        type="text"
        value={headline}
        onChange={(e) => onHeadlineChange(e.target.value)}
        placeholder="e.g. Principal Backend Engineer @ Startup | Distributed Systems & Go"
        maxLength={HEADLINE_MAX_LENGTH}
        hint="Max 120 characters."
      />

      <TextAreaInput
        id="profile-bio"
        label="Bio / About Me"
        value={bio}
        onChange={(e) => onBioChange(e.target.value)}
        rows={5}
        placeholder="Tell your story: what you are building, open-source focus areas, core stack, and engineering philosophy."
        maxLength={BIO_MAX_LENGTH}
        hint={`${bio.length}/1000 characters. Supports line breaks and markdown.`}
      />
    </div>
  );
}
