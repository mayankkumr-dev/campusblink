import os, struct, zlib

LOGO_DIR = 'frontend/public/logo2'
PADDING_Y = 15

def crop_png(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        print(f"Skipping {filepath}: Not a valid PNG signature")
        return

    w, h = struct.unpack('>II', data[16:24])
    color_type = data[25]
    if color_type != 6: # RGBA
        print(f"Skipping {filepath}: color_type={color_type} is not RGBA")
        return

    idat = b''
    pos = 8
    while pos < len(data):
        length, = struct.unpack('>I', data[pos:pos+4])
        chunk_type = data[pos+4:pos+8]
        if chunk_type == b'IDAT':
            idat += data[pos+8:pos+8+length]
        pos += 12 + length

    raw = zlib.decompress(idat)
    row_len = w * 4 + 1
    
    min_y = h
    max_y = 0
    for y in range(h):
        line_start = y * row_len + 1
        for x in range(w):
            alpha = raw[line_start + x * 4 + 3]
            if alpha > 5:
                if y < min_y: min_y = y
                if y > max_y: max_y = y

    if min_y >= max_y:
        print(f"Skipping {filepath}: no non-transparent pixels found")
        return

    y_start = max(min_y - PADDING_Y, 0)
    y_end = min(max_y + PADDING_Y, h - 1)
    new_h = y_end - y_start + 1

    if new_h >= h:
        print(f"Skipping {filepath}: already tightly cropped ({w}x{h})")
        return

    cropped_raw = raw[y_start * row_len : (y_end + 1) * row_len]
    new_idat = zlib.compress(cropped_raw, 9)

    def make_chunk(chunk_type, chunk_data):
        crc = zlib.crc32(chunk_type + chunk_data) & 0xffffffff
        return struct.pack('>I', len(chunk_data)) + chunk_type + chunk_data + struct.pack('>I', crc)

    new_ihdr_data = struct.pack('>II', w, new_h) + data[24:29]

    out = b'\x89PNG\r\n\x1a\n'
    out += make_chunk(b'IHDR', new_ihdr_data)
    out += make_chunk(b'IDAT', new_idat)
    out += make_chunk(b'IEND', b'')

    with open(filepath, 'wb') as f:
        f.write(out)

    print(f"Cropped {filepath}: {w}x{h} -> {w}x{new_h} (cropped {h - new_h} vertical transparent pixels)")

if __name__ == '__main__':
    for fname in sorted(os.listdir(LOGO_DIR)):
        if fname.endswith('.png'):
            crop_png(os.path.join(LOGO_DIR, fname))
