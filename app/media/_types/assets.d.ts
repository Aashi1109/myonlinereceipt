declare module "*.png" {
  const asset: {
    readonly height: number;
    readonly src: string;
    readonly width: number;
  };

  export default asset;
}
