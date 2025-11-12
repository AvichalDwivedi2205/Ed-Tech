import matplotlib.pyplot as plt
import numpy as np

# Create a 3D figure
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# Title and labels
ax.set_title('Visualization 4')
ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_zlabel('Z')

# Description (as text on the figure)
description_text = r"""
$\nabla \cdot \mathbf{D} = \rho$
This states that electric flux diverging from a closed surface is proportional to the enclosed electric charge. $\mathbf{D}$ is the electric displacement field, and $\rho$ is the free charge density.
"""
fig.text(0.02, 0.95, description_text, transform=fig.transFigure, fontsize=10,
         verticalalignment='top', bbox=dict(boxstyle="round,pad=0.5", fc="white", ec="lightgray", lw=1),
         usetex=True)

# Generate realistic data for a point charge at the origin
# This simulates the electric displacement field D around a point charge.
# D = (Q / (4*pi*r^3)) * r_vector
# Let Q / (4*pi) = 1 for simplicity in visualization.

# Create a grid of points, avoiding the exact origin for field calculation
grid_range = np.linspace(-2.5, 2.5, 7)
X, Y, Z = np.meshgrid(grid_range, grid_range, grid_range)

# Calculate radial distance
R_sq = X**2 + Y**2 + Z**2
R = np.sqrt(R_sq)

# Create a mask to exclude the immediate vicinity of the origin
# This prevents extremely large vectors due to singularity
mask = R > 0.3 # Threshold to avoid singularity at the exact origin

# Initialize U, V, W to zeros
U = np.zeros_like(X)
V = np.zeros_like(Y)
W = np.zeros_like(Z)

# Calculate components of D field only for points not near the origin
# Scaling factor for visual magnitude of arrows
field_strength_scale = 0.5 

U[mask] = field_strength_scale * X[mask] / R[mask]**3
V[mask] = field_strength_scale * Y[mask] / R[mask]**3
W[mask] = field_strength_scale * Z[mask] / R[mask]**3

# Plot the quiver (vector field)
# length parameter scales the arrows. If normalize=False, then length=1 means U,V,W are plotted as is.
ax.quiver(X, Y, Z, U, V, W, length=0.8, color='blue', alpha=0.7, arrow_length_ratio=0.5)

# Add a point to represent the charge source at the origin
ax.scatter(0, 0, 0, color='red', s=100, label='Charge Source')
ax.legend()

# Set view angle for better visualization
ax.view_init(elev=20, azim=30)
ax.set_xlim([-3, 3])
ax.set_ylim([-3, 3])
ax.set_zlim([-3, 3])

plt.show()