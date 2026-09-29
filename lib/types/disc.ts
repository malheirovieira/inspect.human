export type DiscPublicQuestion = {
  id: string;
  position: number;
  section: "COMPETENCIAS" | "DISC";
  dimension: string;
  text: string;
};

export type DiscPublicData = {
  title: string;
  questions: DiscPublicQuestion[];
};
