import matplotlib.pyplot as plt
import numpy as np

np.random.seed(42)  # For reproducibility

# Generate data based on the description
# Problem Statement: A microwave signal has a frequency of 2.4 GHz.
# Compare its wavelength in free space to its wavelength in a Teflon (epsilon_r = 2.1) filled waveguide.

frequency = 2.4e9  # 2.4 GHz in Hz
speed_of_light_free_space = 3e8  # m/s
relative_permittivity_teflon = 2.1

# Wavelength in free space (lambda_0 = c / f)
wavelength_free_space = speed_of_light_free_space / frequency

# Wavelength in Teflon (lambda_medium = c / (f * sqrt(epsilon_r)))
wavelength_teflon = speed_of_light_free_space / (frequency * np.sqrt(relative_permittivity_teflon))

wavelength_values = [wavelength_free_space, wavelength_teflon]
medium_labels = ['Free Space', 'Teflon']

# Create plot
fig, ax = plt.subplots(figsize=(8, 6))

ax.bar(medium_labels, wavelength_values, color=['skyblue', 'lightcoral'])

ax.set_title('Visualization 2')
ax.set_xlabel('X')
ax.set_ylabel('Y')

# Add the description to the plot
description_text = "le 3: Comparing Wavelengths\nProblem Statement: A microwave signal has a frequency of 2.4 GHz. Compare its wavelength in free space to its wavelength in a Teflon ($\epsilon_r = 2.1$) filled waveg"
plt.figtext(0.02, 0.02, description_text, wrap=True, horizontalalignment='left', fontsize=9,
            bbox=dict(facecolor='wheat', alpha=0.5, edgecolor='none'))

plt.tight_layout()
# Do NOT include 