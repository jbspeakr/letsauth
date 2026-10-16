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

const relations = defineCollection({
  loader: {
    name: "letsauth-relations",
    load: async ({ store }) => {
      store.clear();
      for (const rel of getDataset().relations) {
        store.set({ id: `${rel.from}-${rel.type}-${rel.to}`, data: rel });
      }
    },
  },
});

const scenarios = defineCollection({
  loader: {
    name: "letsauth-scenarios",
    load: async ({ store }) => {
      store.clear();
      for (const scenario of getDataset().scenarios) {
        store.set({ id: scenario.id, data: scenario });
      }
    },
  },
});

const vulnerabilities = defineCollection({
  loader: {
    name: "letsauth-vulnerabilities",
    load: async ({ store }) => {
      store.clear();
      for (const v of getDataset().vulnerabilities) store.set({ id: v.id, data: v });
    },
  },
});

export const collections = {
  specs,
  features,
  servers,
  observations,
  relations,
  scenarios,
  vulnerabilities,
};
