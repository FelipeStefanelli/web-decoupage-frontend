function Image({ src, alt, width, height, style = {}, ...props }) {
  return (
    <img
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      loading="lazy"
      crossOrigin="anonymous"
      style={{ width, height, objectFit: 'contain', ...style }}
      {...props}
    />
  );
}

export default Image;
