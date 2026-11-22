type AddressCoordinates = { latitude: number; longitude: number };

// GPS is still an option if geocoding or applying its result fails.
export async function tryApplyAddressLocation(
  address: string,
  geocode: (address: string) => Promise<readonly AddressCoordinates[] | null | undefined>,
  apply: (coordinates: AddressCoordinates) => void
): Promise<boolean> {
  if (!address) return false;
  try {
    const first = (await geocode(address))?.[0];
    if (!first) return false;
    apply(first);
    return true;
  } catch {
    return false;
  }
}
