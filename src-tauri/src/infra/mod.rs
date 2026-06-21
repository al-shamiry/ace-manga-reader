//! Filesystem and infrastructure primitives shared across every layer:
//! path construction, image discovery, identifier/naming helpers, and atomic
//! JSON persistence. This is dependency-free leaf code — it knows nothing about
//! commands, services, or the data model.

pub mod atomic;
pub mod image;
pub mod naming;
pub mod paths;
