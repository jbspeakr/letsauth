import { defineCollection } from "astro:content";
import { getDataset } from "./lib/data";

/**
 * Content collections over `data/`. Loading goes through `src/lib/data.ts`, so the pages, the
 * validator and later features (scanner, explorer) all read the same validated dataset.
 */
const specs = defineCollection({
  loader: {
    name: "letsauth-specs",
    load: async ({ store }) => {
      store.clear();
      for (const spec of getDataset().specs) store.set({ id: spec.id, data: spec });
    },
  },
});

const features = defineCollection({
  loader: {
    name: "letsauth-features",
    load: async ({ store }) => {
      store.clear();
      for (const feature of getDataset().features) store.set({ id: feature.id, data: feature });
    },
  },
});

const servers = defineCollection({
  loader: {
    name: "letsauth-servers",
    load: async ({ store }) => {
      store.clear();
      for (const server of getDataset().servers) store.set({ id: server.id, data: server });
    },
  },
});

const observations = defineCollection({
  loader: {
    name: "letsauth-observations",
    load: async ({ store }) => {
      store.clear();
      getDataset().observations.forEach((obs, i) => {
        store.set({ id: `${obs.server}-${obs.feature}-${i}`, data: obs });
      });
    },
  },
});

export const collections = { specs, features, servers, observations };
