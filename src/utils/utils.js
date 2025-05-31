export const formatTimecode = (time) => {
    if (time === null) return "00:00:00";
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const calculateDifference = (currentTimecodeIn, currentTimecodeOut) => {
    if (currentTimecodeIn !== null && currentTimecodeOut !== null) {
        const difference = Math.abs(currentTimecodeOut - currentTimecodeIn);
        return difference;
    }
    return 0;
};

export const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Falha ao ler o arquivo. Tipo de resultado inesperado."));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };
    });

export const base64ToFile = (base64, fileName) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName);
};