export function getISTDate(): Date {
    const now = new Date();
    // IST is UTC+5:30 (330 minutes)
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
}
export function getISTDateWithOffset(hours: number = 0): Date {
    const now = new Date();

    const istOffset = 5.5 * 60 * 60 * 1000;
    const extra = hours * 60 * 60 * 1000;

    return new Date(now.getTime() + istOffset + extra);
}