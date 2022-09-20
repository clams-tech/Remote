export type NoiseStateOptions = {
    /**
     * Local private key as a 32-byte buffer
     */
    ls: Buffer;

    /**
     * Ephemeral private key as a 32-byte
     */
    es: Buffer;
};
