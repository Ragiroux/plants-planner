export interface CompanionSeedData {
  plantASlug: string;
  plantBSlug: string;
  relationship: "beneficial" | "antagonistic";
  reason: string;
}

export const companions: CompanionSeedData[] = [
  {
    plantASlug: "carotte",
    plantBSlug: "tomate",
    relationship: "beneficial",
    reason:
      "Les tomates repoussent la mouche de la carotte; les carottes ameublissent le sol autour des racines de tomates.",
  },
  {
    plantASlug: "carotte",
    plantBSlug: "oignon",
    relationship: "beneficial",
    reason:
      "L'oignon repousse la mouche de la carotte; la carotte repousse la mouche de l'oignon.",
  },
  {
    plantASlug: "carotte",
    plantBSlug: "poireau",
    relationship: "beneficial",
    reason:
      "Répulsion mutuelle des ravageurs: le poireau contre la mouche de la carotte, la carotte contre la teigne du poireau.",
  },
  {
    plantASlug: "carotte",
    plantBSlug: "pois",
    relationship: "beneficial",
    reason:
      "Les pois fixent l'azote dans le sol, bénéfique pour les carottes.",
  },
  {
    plantASlug: "carotte",
    plantBSlug: "laitue",
    relationship: "beneficial",
    reason:
      "La laitue fournit un couvre-sol qui retient l'humidité autour des carottes.",
  },
  {
    plantASlug: "concombre",
    plantBSlug: "haricot-nain",
    relationship: "beneficial",
    reason:
      "Les haricots fixent l'azote, profitant aux concombres gourmands en nutriments.",
  },
  {
    plantASlug: "courgette",
    plantBSlug: "mais",
    relationship: "beneficial",
    reason:
      "Les trois sœurs: la courgette couvre le sol, limitant les mauvaises herbes et conservant l'humidité.",
  },
  {
    plantASlug: "haricot-grimpant",
    plantBSlug: "mais",
    relationship: "beneficial",
    reason:
      "Les trois sœurs: le haricot grimpe sur le maïs et fixe l'azote dans le sol.",
  },
  {
    plantASlug: "courgette",
    plantBSlug: "haricot-grimpant",
    relationship: "beneficial",
    reason:
      "Les trois sœurs: la courgette, le haricot et le maïs se complètent mutuellement.",
  },
  {
    plantASlug: "brocoli",
    plantBSlug: "celeri",
    relationship: "beneficial",
    reason:
      "Le céleri éloigne la piéride du chou et autres ravageurs des brassicas.",
  },
  {
    plantASlug: "brocoli",
    plantBSlug: "betterave",
    relationship: "beneficial",
    reason:
      "Profondeurs de racines complémentaires; la betterave ajoute des minéraux au sol.",
  },
  {
    plantASlug: "epinard",
    plantBSlug: "laitue",
    relationship: "beneficial",
    reason:
      "La laitue protège les épinards du soleil intense; partage de l'espace aérien.",
  },
  {
    plantASlug: "laitue",
    plantBSlug: "radis-de-printemps",
    relationship: "beneficial",
    reason:
      "Le radis marque les rangs de laitue et repousse les pucerons; récoltes successives.",
  },
  {
    plantASlug: "laitue",
    plantBSlug: "carotte",
    relationship: "beneficial",
    reason:
      "Bonne utilisation de l'espace: la laitue pousse en surface pendant que les carottes s'enfoncent.",
  },
  {
    plantASlug: "tomate",
    plantBSlug: "oignon",
    relationship: "beneficial",
    reason:
      "L'oignon repousse de nombreux insectes nuisibles aux tomates comme la noctuelle.",
  },
  {
    plantASlug: "aubergine",
    plantBSlug: "haricot-nain",
    relationship: "beneficial",
    reason:
      "Les haricots repoussent les doryphores qui attaquent parfois les aubergines.",
  },
  {
    plantASlug: "bette-a-carde",
    plantBSlug: "oignon",
    relationship: "beneficial",
    reason:
      "L'oignon protège la bette à carde contre certains insectes du sol.",
  },
  {
    plantASlug: "chou-pomme",
    plantBSlug: "celeri",
    relationship: "beneficial",
    reason:
      "Le céleri éloigne la piéride du chou et la mouche du chou.",
  },
  {
    plantASlug: "betterave",
    plantBSlug: "oignon",
    relationship: "beneficial",
    reason:
      "L'oignon repousse les pucerons et certains ravageurs de la betterave.",
  },
  {
    plantASlug: "pois",
    plantBSlug: "oseille",
    relationship: "beneficial",
    reason:
      "Les pois fixent l'azote bénéfique pour l'oseille vivace; partage d'espace précoce.",
  },
  {
    plantASlug: "mais",
    plantBSlug: "soja-edamame",
    relationship: "beneficial",
    reason:
      "Le soja fixe l'azote dont le maïs est très gourmand.",
  },
  {
    plantASlug: "poireau",
    plantBSlug: "carotte",
    relationship: "beneficial",
    reason:
      "Association classique: répulsion mutuelle des ravageurs spécifiques.",
  },
  {
    plantASlug: "concombre",
    plantBSlug: "radis-de-printemps",
    relationship: "beneficial",
    reason:
      "Le radis repousse les chrysomèles des concombres.",
  },
  {
    plantASlug: "tomate",
    plantBSlug: "oignon",
    relationship: "beneficial",
    reason:
      "L'oignon repousse plusieurs insectes nuisibles des tomates.",
  },
  {
    plantASlug: "mesclun",
    plantBSlug: "radis-de-printemps",
    relationship: "beneficial",
    reason:
      "Le radis ameublit le sol pour le mesclun et repousse les pucerons.",
  },
  {
    plantASlug: "piment-poivron",
    plantBSlug: "tomate",
    relationship: "beneficial",
    reason:
      "Besoins similaires en chaleur; partage des systèmes de tuteurage.",
  },
  {
    plantASlug: "chou-frise",
    plantBSlug: "celeri",
    relationship: "beneficial",
    reason:
      "Le céleri éloigne les papillons blancs du chou frisé.",
  },
  {
    plantASlug: "panais",
    plantBSlug: "pois",
    relationship: "beneficial",
    reason:
      "Les pois fixent l'azote, utile pour les panais à long cycle.",
  },
  {
    plantASlug: "courgette",
    plantBSlug: "oignon",
    relationship: "beneficial",
    reason:
      "L'oignon repousse les limaces et certains ravageurs de la courgette.",
  },
  {
    plantASlug: "navet",
    plantBSlug: "pois",
    relationship: "beneficial",
    reason:
      "Les pois fournissent de l'azote bénéfique pour les navets.",
  },
  {
    plantASlug: "chou-pomme",
    plantBSlug: "tomate",
    relationship: "antagonistic",
    reason:
      "Compétition pour les mêmes nutriments; les tomates peuvent inhiber la croissance du chou.",
  },
  {
    plantASlug: "haricot-nain",
    plantBSlug: "oignon",
    relationship: "antagonistic",
    reason:
      "Les oignons (alliums) inhibent la croissance des haricots et réduisent leur production.",
  },
  {
    plantASlug: "oignon",
    plantBSlug: "pois",
    relationship: "antagonistic",
    reason:
      "Les oignons (alliums) freinent la croissance des pois.",
  },
  {
    plantASlug: "concombre",
    plantBSlug: "tomate",
    relationship: "antagonistic",
    reason:
      "Favorisent le mildiou et les maladies fongiques mutuellement en milieu humide.",
  },
  {
    plantASlug: "betterave",
    plantBSlug: "haricot-grimpant",
    relationship: "antagonistic",
    reason:
      "Les haricots grimpants perturbent la croissance des betteraves.",
  },
  {
    plantASlug: "chou-chinois",
    plantBSlug: "tomate",
    relationship: "antagonistic",
    reason:
      "Les tomates et les brassicas se nuisent mutuellement en compétition de nutriments.",
  },
  {
    plantASlug: "oignon",
    plantBSlug: "poireau",
    relationship: "antagonistic",
    reason:
      "Même famille, mêmes ravageurs; regrouper oignons et poireaux amplifie les risques de maladies.",
  },
  {
    plantASlug: "fenouil",
    plantBSlug: "tomate",
    relationship: "antagonistic",
    reason:
      "Le fenouil émet des substances allélopathiques qui inhibent la plupart des plantes voisines.",
  },
  {
    plantASlug: "aubergine",
    plantBSlug: "concombre",
    relationship: "antagonistic",
    reason:
      "Les deux sont sensibles aux mêmes maladies fongiques; la proximité augmente les risques.",
  },
];
