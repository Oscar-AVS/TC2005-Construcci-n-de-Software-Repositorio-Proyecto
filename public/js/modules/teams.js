function openEditTeamModal(id, teamName, description, leaderId) {
document.getElementById('editTeamId').value = id;
document.getElementById('editTeamName').value = teamName;
document.getElementById('editTeamDescription').value = description;
document.getElementById('editTeamLeader').value = leaderId;
document.getElementById('editTeamModal').style.display = 'flex';
}

function closeEditTeamModal() {
document.getElementById('editTeamModal').style.display = 'none';
}

document.getElementById('editTeamModal').addEventListener('click', (e) => {
if (e.target === document.getElementById('editTeamModal')) closeEditTeamModal();
});

function openDeleteTeamModal(id) {
document.getElementById('deleteTeamId').value = id;
document.getElementById('deleteTeamModal').style.display = 'flex';
}

function closeDeleteTeamModal() {
document.getElementById('deleteTeamModal').style.display = 'none';
}

document.getElementById('deleteTeamModal').addEventListener('click', (e) => {
if (e.target === document.getElementById('deleteTeamModal')) closeDeleteTeamModal();
});