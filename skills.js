document.addEventListener('DOMContentLoaded', () => {
    const createSkillBtn = document.getElementById('create-skill-btn');
    const skillModal = document.getElementById('skill-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const skillForm = document.getElementById('skill-form');
    const skillsContainer = document.getElementById('skills-container');
    const token = localStorage.getItem('token');

    async function fetchSkills() {
        try {
            const response = await fetch('http://localhost:3000/api/skills', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const skills = await response.json();
            skillsContainer.innerHTML = ''; // Clear before adding
            skills.forEach(skill => {
                const skillCard = document.createElement('div');
                skillCard.className = 'skill-card';
                skillCard.innerHTML = `
                    <h3>${skill.name}</h3>
                    <p><strong>Category:</strong> ${skill.category}</p>
                    <p><strong>Type:</strong> ${skill.type}</p>
                    <p>${skill.description}</p>
                `;
                skillsContainer.appendChild(skillCard);
            });
        } catch (error) {
            console.error('Error fetching skills:', error);
        }
    }

    async function createSkill(event) {
        event.preventDefault();
        const skillData = {
            name: document.getElementById('skill-name').value,
            category: document.getElementById('skill-category').value,
            type: document.getElementById('skill-type').value,
            damage_formula: { base: '10', stat: 'str' }, // Example
            buff_effect: { stat: 'str', value: 5 }, // Example
            debuff_effect: { stat: 'def', value: -5 }, // Example
            description: document.getElementById('skill-description').value,
            skill_for: document.getElementById('skill-for').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/skills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(skillData)
            });

            if (response.ok) {
                skillModal.classList.add('hidden');
                fetchSkills(); // Refresh the skill list
            } else {
                const error = await response.json();
                alert(`Failed to create skill: ${error.message}`);
            }
        } catch (error) {
            console.error('Error creating skill:', error);
        }
    }

    createSkillBtn.addEventListener('click', () => skillModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => skillModal.classList.add('hidden'));
    skillForm.addEventListener('submit', createSkill);

    if (token) {
        fetchSkills();
    } else {
        window.location.href = 'login.html';
    }
});