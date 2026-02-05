-- Migration 116: Seed NPO Outreach List
-- Based on research of Montessori schools serving underprivileged communities worldwide

-- Clear existing data (if re-running)
-- DELETE FROM montree_npo_outreach;

-- ============================================================================
-- INTERNATIONAL ORGANIZATIONS & NETWORKS
-- ============================================================================

INSERT INTO montree_npo_outreach (organization_name, organization_type, country, description, community_served, website, source, priority) VALUES
('Educateurs sans Frontières (EsF)', 'network', 'Global', 'Part of AMI; founded 1999 by Renilde Montessori. Global network supporting vulnerable populations including indigenous peoples, displaced persons, and low-income communities.', 'Indigenous peoples, displaced persons, low-income communities worldwide', 'https://montessori-esf.org/', 'research', 'high'),
('Montessori Global Growth Fund (MGGF)', 'foundation', 'Global', 'Awards grants for Montessori schools in under-resourced communities worldwide. Funds classroom construction, school gardens, kitchens.', 'Under-resourced communities in US, East Africa, Europe', 'https://www.montessori-mggf.org/', 'research', 'high'),
('National Center for Montessori in the Public Sector (NCMPS)', 'network', 'USA', 'Non-profit supporting 590+ public Montessori schools/programs in all 50 states. Provides startup, training, and coaching services.', 'Public school students, low-income families', 'https://www.public-montessori.org/', 'research', 'high'),
('Wildflower Schools', 'network', 'USA', 'Open-source network of teacher-led Montessori microschools operating in 20+ states and Puerto Rico.', 'Diverse communities across 20+ US states', 'https://www.wildflowerschools.org', 'research', 'medium'),
('Indian Montessori Foundation (IMF)', 'foundation', 'India', 'AMI affiliate training AMI-qualified educators for meaningful impact across India.', 'Underprivileged children across India', 'https://montessori-india.org/', 'research', 'high');

-- ============================================================================
-- AFRICA
-- ============================================================================

INSERT INTO montree_npo_outreach (organization_name, organization_type, country, region, city, description, community_served, website, source, priority) VALUES
('Samburu Nomadic School Initiative', 'school', 'Kenya', 'Northern Kenya', 'Namunyak Conservancy', 'EsF project operating 4 mobile Montessori schools for nomadic Samburu pastoralists ages 3-6. Over 600 children served since 2019.', 'Nomadic Samburu pastoralist children', 'https://montessori-esf.org/project/samburu', 'research', 'high'),
('SARARA Foundation Education Program', 'foundation', 'Kenya', 'Northern Kenya', 'Namunyak Conservancy', 'First rural, mobile Montessori schools in the world (2019). Teaches 13 teachers in tented environments with collapsible materials.', 'Rural nomadic children in conservancy', 'https://sarara.co/nomadic-education-program', 'research', 'high'),
('CoRE South Africa Initiative', 'school', 'South Africa', 'Western Cape', 'Kayamandi, Stellenbosch', 'Educateurs sans Frontières Community Rooted Education program. Piloted April 2021 in low-income suburb.', 'Low-income children in Kayamandi township', 'https://montessori-esf.org/project/community-rooted-education-south-africa', 'research', 'high'),
('Foundation for Montessori Education in Nigeria (FMEN)', 'foundation', 'Nigeria', NULL, NULL, 'AMI-affiliated society promoting Montessori framework for societal benefit and child welfare.', 'Children across Nigeria', 'https://montessori-ami.org/about-ami/affiliated-societies/foundation-montessori-education-nigeria', 'research', 'medium');

-- ============================================================================
-- INDIA
-- ============================================================================

INSERT INTO montree_npo_outreach (organization_name, organization_type, country, region, city, description, community_served, website, source, priority) VALUES
('CoRE India Initiative', 'school', 'India', 'Telangana', 'Hyderabad', 'Community Rooted Education program (2016-present). Montessori classroom in rural orphanage serving children in Anees ul Gurba orphanage.', 'Orphaned children in rural areas', 'https://montessori-esf.org/project/community-rooted-education-india', 'research', 'high'),
('Vibha', 'foundation', 'India', NULL, 'Multiple locations', 'Platinum-rated nonprofit providing education and opportunities for underprivileged children in India.', 'Underprivileged children across India', 'https://vibha.org/', 'research', 'medium');

-- ============================================================================
-- SOUTHEAST ASIA - PHILIPPINES
-- ============================================================================

INSERT INTO montree_npo_outreach (organization_name, organization_type, country, region, city, description, community_served, website, source, priority) VALUES
('MCA Montessori School', 'school', 'Philippines', NULL, NULL, 'Non-stock, non-sectarian institution. Philosophy: "Every Filipino child, irrespective of religion and economic status has the right to quality education."', 'Low-income Filipino families', 'https://mcams.edu.ph/', 'research', 'high'),
('Maria Montessori Children''s School Foundation Inc. (MMCSFI)', 'school', 'Philippines', NULL, NULL, '45 years of elementary program experience. Established adolescent program 2013.', 'Filipino children', 'https://www.mmcsfi.edu.ph/', 'research', 'medium');

-- ============================================================================
-- LATIN AMERICA - MEXICO
-- ============================================================================

INSERT INTO montree_npo_outreach (organization_name, organization_type, country, description, community_served, website, source, priority) VALUES
('Horme Montessori Network', 'network', 'Mexico', 'Network spanning Mexico transforming lives through diverse initiatives. Projects include: Montessori for indigenous communities, vulnerable populations, and children of incarcerated mothers.', 'Indigenous communities, vulnerable populations, incarcerated mothers'' children', 'https://horme.com.mx/home/', 'research', 'high'),
('Montessori Association Peru', 'association', 'Peru', 'Contributes to education in Peru/South America through Montessori pedagogy in public and private education.', 'Children in Peru and South America', 'https://montessori-ami.org/about-ami/affiliated-societies/montessori-association-per%C3%BA', 'research', 'medium');

-- ============================================================================
-- UNITED STATES - PUBLIC CHARTER SCHOOLS
-- ============================================================================

INSERT INTO montree_npo_outreach (organization_name, organization_type, country, region, city, description, community_served, website, source, priority) VALUES
('Monocacy Valley Montessori Public Charter School', 'school', 'USA', 'Maryland', 'Frederick County', 'Maryland''s first public charter Montessori school (2002). Free, tuition-free for all K-5 students.', 'All Frederick County children regardless of income', 'https://mvmpcs.org/', 'research', 'medium'),
('Carroll Creek Montessori Public Charter School', 'school', 'USA', 'Maryland', 'Frederick County', 'Part of Monocacy Montessori Communities Inc. Free public charter serving K-5 and Title I communities.', 'Title I community students', 'https://carrollcreekmontessori.org/', 'research', 'medium'),
('Community Montessori Charter School', 'school', 'USA', 'California', 'San Diego County', 'Tuition-free public charter TK-8 serving entire San Diego County low-income families.', 'Low-income families in San Diego County', 'https://www.cmcharter.org/', 'research', 'medium'),
('Monarch Montessori of Denver', 'school', 'USA', 'Colorado', 'Denver', 'K-5 free public charter through Denver Public Schools. Accepts CCAP, Denver Preschool Program. Features dual language pathway.', 'Low-income families in Far Northeast Denver', 'https://www.monarchm.com/', 'research', 'high'),
('Breakthrough Montessori Public Charter School', 'school', 'USA', 'District of Columbia', 'Washington, D.C.', 'Founded 2016 by NCMPS. Serves 300+ children ages 3 through 2nd grade from low-income D.C. families.', 'Low-income D.C. families', NULL, 'research', 'high'),
('Latin American Montessori Bilingual (LAMB) PCS', 'school', 'USA', 'District of Columbia', 'Washington, D.C.', 'Public charter serving D.C. low-income communities with bilingual Montessori approach.', 'Low-income D.C. communities, bilingual families', 'https://www.lambpcs.org/', 'research', 'high'),
('Philadelphia Montessori Charter School', 'school', 'USA', 'Pennsylvania', 'Philadelphia', 'Public charter operating in urban setting serving low-income Philadelphia communities.', 'Low-income Philadelphia communities', 'https://www.philadelphiamontessori.org/', 'research', 'medium');

-- ============================================================================
-- Summary: Total entries seeded
-- ============================================================================
-- International Organizations: 5
-- Africa: 4
-- India: 2
-- Southeast Asia: 2
-- Latin America: 2
-- USA: 7
-- Total: 22 organizations for initial outreach
