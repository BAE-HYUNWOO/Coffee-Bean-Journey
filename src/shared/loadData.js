

export async function loadCsv(path) {
  try {
    return await d3.csv(path, d3.autoType);
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return [];
  }
}

export async function loadJson(path) {
  try {
    return await d3.json(path);
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return null;
  }
}
