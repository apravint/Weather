import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const editImage = vi.hoisted(() => vi.fn());
vi.mock('../services/geminiService', () => ({ editImage }));

import ImageEditor from '../components/ImageEditor';

beforeEach(() => {
  editImage.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:original');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ blob: async () => new Blob(['img'], { type: 'image/png' }) })),
  );
});

describe('<ImageEditor />', () => {
  it('hides the prompt and generate controls until an image is chosen', () => {
    render(<ImageEditor />);
    expect(screen.queryByLabelText(/Describe Your Edit/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generate Edit/ })).not.toBeInTheDocument();
  });

  it('uploads an image, sends it with the prompt and renders the edited result', async () => {
    editImage.mockResolvedValue('RESULT64');
    const user = userEvent.setup();
    render(<ImageEditor />);

    await user.upload(
      screen.getByLabelText(/Upload an Image/),
      new File(['x'], 'cat.png', { type: 'image/png' }),
    );
    expect(screen.getByAltText('Original')).toHaveAttribute('src', 'blob:original');

    const generate = screen.getByRole('button', { name: /Generate Edit/ });
    expect(generate).toBeDisabled();
    await user.type(screen.getByLabelText(/Describe Your Edit/), 'make it retro');
    await user.click(generate);

    const edited = await screen.findByAltText('Edited');
    expect(edited).toHaveAttribute('src', 'data:image/png;base64,RESULT64');
    expect(editImage).toHaveBeenCalledWith(expect.any(String), 'image/png', 'make it retro');
  });

  it('shows an error when editing fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    editImage.mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    render(<ImageEditor />);

    await user.upload(screen.getByLabelText(/Upload an Image/), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.type(screen.getByLabelText(/Describe Your Edit/), 'x');
    await user.click(screen.getByRole('button', { name: /Generate Edit/ }));

    expect(await screen.findByText(/Failed to edit image/)).toBeInTheDocument();
    expect(screen.queryByAltText('Edited')).not.toBeInTheDocument();
  });
});
