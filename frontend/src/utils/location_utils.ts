/* utils for getting user's location */

export const getLocation = (): Promise<unknown> => {
  return fetch("https://geolocation-db.com/json/", {
    method: "GET",
  }).then((res) => res.json())
}
