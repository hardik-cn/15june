export function replaceVariables(
    content: string,
    variables: Record<string, string>
) {
    return content.replace(/{{(.*?)}}/g, (_, key) => {
        const variableKey = key.trim();
        return variables[variableKey] || "";
    });
}